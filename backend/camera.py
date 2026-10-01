"""Bed camera: an ESP32-CAM on the stand photographs the bed on a schedule.

The camera is its own node, separate from Bed 1's irrigation ESP32 — the
OV2640 uses nearly every free GPIO and its current spikes brown out anything
sharing its supply. It never serves anything itself: it only makes OUTBOUND
requests to this backend, so it works from any network with no tunnel.

    camera --POST jpeg--> /api/camera/{bed}/frames   (every CAPTURE interval)
    camera --GET-------> /api/camera/{bed}/pending   (every ~20 s: "take one now?")
    app    --GET-------> /api/camera/{bed}           (latest frames, signed URLs)
    app    --POST------> /api/camera/{bed}/capture   (the "Take photo" button)
    app    --POST------> /api/camera/{bed}/health-check (AI check of latest photo)

Frames live in the private Supabase Storage bucket `bed-camera` (created
2026-09-24, JPEG + JSON only, 1 MB cap), under `bed<id>/<UTC stamp>_<reason>.jpg` so a
plain name sort is chronological. The bucket has no policies: only this backend,
holding SUPABASE_SERVICE_ROLE_KEY, can read or write it. Clients get short-lived
signed URLs, which is what lets a plain <img>/<Image> load a private object
without sending a bearer token.

Device auth is a shared secret in the X-Camera-Key header (CAMERA_SHARED_SECRET
here, SHARED_SECRET in the sketch) — the same scheme as the irrigation node,
since a microcontroller can't hold a Supabase user session.

AUTOMATIC HEALTH CHECKS: once a day, the first photo that arrives inside the
good-light window (HEALTH_WINDOW_START..END local time) is sent to Gemini via
diagnosis.py, and the result is kept as `health/bed<id>/latest.json` (plus a
timestamped copy, for the season record). A moderate/high disease, pest or
deficiency finding calls main.py's alert hook (Recent Activity + WhatsApp).
The farmer can also run a check on the latest photo from either app.

Env vars are read lazily for the same reason as auth.py: main.py imports this
module before load_dotenv() runs.
"""

import base64
import hmac
import json
import os
import threading
import time
from datetime import date, datetime, timedelta, timezone
from typing import Callable

import requests
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request

from auth import _supabase_url, require_user
from diagnosis import diagnose_image

BUCKET = "bed-camera"
CAMERA_BED_IDS = {1}  # only Bed 1 has a camera so far

# Matches the bucket's file_size_limit. An SVGA frame at the sketch's quality
# setting is ~30-70 KB, so anything near this is a misconfigured camera.
MAX_FRAME_BYTES = 1024 * 1024

# The camera checks /pending every ~20 s; three missed checks = offline.
ONLINE_WINDOW_SEC = 60

SIGNED_URL_TTL_SEC = 3600
# Signed URLs change on every signing, and a changed URL means clients
# re-download every image. So the signed listing is cached and only rebuilt
# when a new frame arrives or the URLs get close to expiring.
LISTING_CACHE_SEC = SIGNED_URL_TTL_SEC - 600

VALID_REASONS = {"scheduled", "requested", "irrigation", "boot"}

# --- automatic health checks ---------------------------------------------
# Zimbabwe is CAT (UTC+2, no DST); Render's clock is UTC.
LOCAL_UTC_OFFSET = timedelta(hours=2)
# Midday light: bright and even, without the long shadows and orange cast of
# early morning / late afternoon that read as "yellowing" to a vision model.
HEALTH_WINDOW_START_HOUR = 10
HEALTH_WINDOW_END_HOUR = 15
# Manual checks cost a Gemini call each; stop a mashed button running up the bill.
MANUAL_CHECK_COOLDOWN_SEC = 300
ALERT_STATUSES = {"diseased", "pest", "nutrient_deficiency"}
ALERT_SEVERITIES = {"moderate", "high"}
# A failing Gemini call retries on later photos in the window, but only this
# many times a day, so an outage can't turn into a call on every photo.
MAX_AUTO_ATTEMPTS_PER_DAY = 3

router = APIRouter()

_last_seen: dict[int, float] = {}          # bed -> time.time() of last device contact
_last_rssi: dict[int, int] = {}
_pending: dict[int, str] = {}              # bed -> reason a capture was requested
_listing_cache: dict[int, tuple[float, int, list]] = {}  # bed -> (expires, limit, frames)

_health: dict[int, dict] = {}              # bed -> latest health record
_health_loaded: set[int] = set()           # beds whose latest.json has been read back
_health_running: set[int] = set()
_health_lock = threading.Lock()
_last_manual_check: dict[int, float] = {}
_last_auto_day: dict[int, date] = {}
_auto_attempts: dict[int, tuple[date, int]] = {}  # bed -> (day, tries)

# Set by main.py (which owns the beds, activity log and WhatsApp helper) —
# avoids camera.py importing main.py back.
_on_health_issue: Callable[[int, dict], None] | None = None
_crop_for_bed: Callable[[int], str | None] | None = None


def set_health_alert_hook(on_issue: Callable[[int, dict], None],
                          crop_for_bed: Callable[[int], str | None]) -> None:
    global _on_health_issue, _crop_for_bed
    _on_health_issue = on_issue
    _crop_for_bed = crop_for_bed


def request_capture(bed_id: int, reason: str = "requested") -> None:
    """Ask the bed's camera for a fresh frame on its next /pending check.

    Called by main.py when an irrigation cycle ends, so every cycle leaves a
    photo of the watered bed. Repeated requests collapse into one.
    """
    if bed_id in CAMERA_BED_IDS:
        _pending[bed_id] = reason


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _service_key() -> str:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Bed camera storage isn't configured — set SUPABASE_SERVICE_ROLE_KEY "
            "(Supabase dashboard -> Project Settings -> API keys) in backend/.env / Render.",
        )
    return key


def _storage(method: str, path: str, **kwargs) -> requests.Response:
    key = _service_key()
    headers = {"Authorization": f"Bearer {key}", "apikey": key, **kwargs.pop("headers", {})}
    try:
        res = requests.request(
            method, f"{_supabase_url()}/storage/v1{path}", headers=headers, timeout=15, **kwargs
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Supabase Storage unreachable: {e}")
    if not res.ok:
        raise HTTPException(status_code=502, detail=f"Supabase Storage error {res.status_code}: {res.text[:200]}")
    return res


def _check_bed(bed_id: int) -> None:
    if bed_id not in CAMERA_BED_IDS:
        raise HTTPException(status_code=404, detail=f"Bed {bed_id} has no camera")


def require_camera(x_camera_key: str | None = Header(default=None)) -> None:
    secret = os.environ.get("CAMERA_SHARED_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="CAMERA_SHARED_SECRET is not set on the server")
    # compare_digest: a plain == leaks how many leading characters matched.
    if not x_camera_key or not hmac.compare_digest(x_camera_key, secret):
        raise HTTPException(status_code=401, detail="Bad camera key")


def _touch(bed_id: int, rssi: str | None) -> None:
    _last_seen[bed_id] = time.time()
    if rssi and rssi.lstrip("-").isdigit():
        _last_rssi[bed_id] = int(rssi)


def _parse_frame_name(name: str) -> tuple[str, str]:
    """'20260924T101500Z_scheduled.jpg' -> ('2026-09-24T10:15:00Z', 'scheduled')."""
    stem = name.rsplit(".", 1)[0]
    stamp, _, reason = stem.partition("_")
    try:
        taken = datetime.strptime(stamp, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        return taken.isoformat().replace("+00:00", "Z"), reason or "scheduled"
    except ValueError:
        return "", reason or "scheduled"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _local_now() -> datetime:
    return datetime.now(timezone.utc) + LOCAL_UTC_OFFSET


# ---------------------------------------------------------------------------
# automatic crop-health checks
# ---------------------------------------------------------------------------

def _health_path(bed_id: int, name: str) -> str:
    return f"health/bed{bed_id}/{name}"


def _get_health(bed_id: int) -> dict | None:
    """Latest health record, read back from Storage once after a restart."""
    if bed_id not in _health_loaded:
        _health_loaded.add(bed_id)
        try:
            res = _storage("GET", f"/object/authenticated/{BUCKET}/{_health_path(bed_id, 'latest.json')}")
            _health.setdefault(bed_id, res.json())
        except (HTTPException, ValueError):
            pass  # none saved yet (404) or storage down: the next check writes one
    return _health.get(bed_id)


def _auto_check_due(bed_id: int) -> bool:
    """True for the first photo inside today's good-light window.

    Only automatic checks count toward "done today": the daily record should be
    comparable day to day (same window, same light), and a manual check at dusk
    isn't. After a restart the day is recovered from latest.json when that was
    an automatic check; otherwise at worst one extra check runs.
    """
    now = _local_now()
    if not (HEALTH_WINDOW_START_HOUR <= now.hour < HEALTH_WINDOW_END_HOUR):
        return False
    if bed_id not in _last_auto_day:
        last = _get_health(bed_id)
        if last and last.get("trigger") == "auto" and last.get("checkedAt"):
            checked = datetime.fromisoformat(last["checkedAt"].replace("Z", "+00:00"))
            _last_auto_day[bed_id] = (checked + LOCAL_UTC_OFFSET).date()
    if _last_auto_day.get(bed_id) == now.date():
        return False
    day, tries = _auto_attempts.get(bed_id, (now.date(), 0))
    return day != now.date() or tries < MAX_AUTO_ATTEMPTS_PER_DAY


def run_health_check(bed_id: int, jpeg: bytes, frame_id: str, trigger: str) -> dict:
    """Diagnose one frame, persist the result, alert on a real problem."""
    with _health_lock:
        if bed_id in _health_running:
            raise HTTPException(status_code=409, detail="A health check is already running for this bed")
        _health_running.add(bed_id)
    try:
        crop = _crop_for_bed(bed_id) if _crop_for_bed else None
        diagnosis = diagnose_image(
            base64.b64encode(jpeg).decode("ascii"), "image/jpeg", crop, source="bed-camera"
        )
        taken_at, _ = _parse_frame_name(frame_id)
        record = {
            **diagnosis,
            "checkedAt": _iso_now(),
            "frameId": frame_id,
            "frameTakenAt": taken_at,
            "trigger": trigger,
        }
        _health[bed_id] = record
        if trigger == "auto":
            _last_auto_day[bed_id] = _local_now().date()

        body = json.dumps(record).encode("utf-8")
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        for name in ("latest.json", f"{stamp}_{trigger}.json"):
            try:
                _storage("POST", f"/object/{BUCKET}/{_health_path(bed_id, name)}", data=body,
                         headers={"Content-Type": "application/json", "x-upsert": "true"})
            except HTTPException as e:
                print(f"[camera] could not persist health record {name}: {e.detail}")

        if (record.get("healthStatus") in ALERT_STATUSES
                and record.get("severity") in ALERT_SEVERITIES and _on_health_issue):
            try:
                _on_health_issue(bed_id, record)
            except Exception as e:  # an alert failure must not lose the result
                print(f"[camera] health alert hook failed: {e}")
        return record
    finally:
        _health_running.discard(bed_id)


def _auto_health_check(bed_id: int, jpeg: bytes, frame_id: str) -> None:
    """BackgroundTasks entry point: runs after the camera already got its 200."""
    today = _local_now().date()
    day, tries = _auto_attempts.get(bed_id, (today, 0))
    _auto_attempts[bed_id] = (today, tries + 1 if day == today else 1)
    try:
        run_health_check(bed_id, jpeg, frame_id, "auto")
    except HTTPException as e:
        print(f"[camera] automatic health check failed: {e.detail}")


# ---------------------------------------------------------------------------
# device endpoints (X-Camera-Key)
# ---------------------------------------------------------------------------

@router.post("/api/camera/{bed_id}/frames", dependencies=[Depends(require_camera)])
async def upload_frame(
    bed_id: int,
    request: Request,
    background: BackgroundTasks,
    reason: str = "scheduled",
    x_camera_rssi: str | None = Header(default=None),
):
    """Store one JPEG sent as the raw request body (Content-Type: image/jpeg)."""
    _check_bed(bed_id)
    _touch(bed_id, x_camera_rssi)

    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_FRAME_BYTES:
        raise HTTPException(status_code=413, detail="Frame too large")
    body = await request.body()
    if len(body) > MAX_FRAME_BYTES:
        raise HTTPException(status_code=413, detail="Frame too large")
    # JPEG start-of-image marker. Catches a truncated/garbage upload before it
    # becomes a broken thumbnail in both apps.
    if not body.startswith(b"\xff\xd8"):
        raise HTTPException(status_code=400, detail="Body is not a JPEG")

    if reason not in VALID_REASONS:
        reason = "scheduled"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = f"bed{bed_id}/{stamp}_{reason}.jpg"
    _storage(
        "POST", f"/object/{BUCKET}/{path}",
        data=body, headers={"Content-Type": "image/jpeg", "x-upsert": "true"},
    )

    _listing_cache.pop(bed_id, None)
    if bed_id not in _health_running and _auto_check_due(bed_id):
        background.add_task(_auto_health_check, bed_id, body, path.split("/", 1)[1])
    if reason != "scheduled":
        _pending.pop(bed_id, None)
    return {"stored": path, "capture": bed_id in _pending}


@router.get("/api/camera/{bed_id}/pending", dependencies=[Depends(require_camera)])
def pending_capture(bed_id: int, x_camera_rssi: str | None = Header(default=None)):
    """Cheap poll: doubles as the camera's heartbeat for the online indicator."""
    _check_bed(bed_id)
    _touch(bed_id, x_camera_rssi)
    reason = _pending.get(bed_id)
    return {"capture": reason is not None, "reason": reason or ""}


# ---------------------------------------------------------------------------
# app endpoints (Supabase user)
# ---------------------------------------------------------------------------

@router.get("/api/camera/{bed_id}", dependencies=[Depends(require_user)])
def get_camera(bed_id: int, limit: int = 24):
    """Latest frames, newest first, each with a signed URL valid for an hour."""
    _check_bed(bed_id)
    limit = min(max(1, limit), 96)

    cached = _listing_cache.get(bed_id)
    if cached and cached[0] > time.monotonic() and cached[1] >= limit:
        frames = cached[2][:limit]
    else:
        listing = _storage(
            "POST", f"/object/list/{BUCKET}",
            json={"prefix": f"bed{bed_id}/", "limit": limit, "offset": 0,
                  "sortBy": {"column": "name", "order": "desc"}},
        ).json()
        names = [o["name"] for o in listing if o.get("name", "").endswith(".jpg")]

        frames = []
        if names:
            signed = _storage(
                "POST", f"/object/sign/{BUCKET}",
                json={"expiresIn": SIGNED_URL_TTL_SEC, "paths": [f"bed{bed_id}/{n}" for n in names]},
            ).json()
            by_path = {s.get("path"): s.get("signedURL") for s in signed if s.get("signedURL")}
            for n in names:
                url = by_path.get(f"bed{bed_id}/{n}")
                if not url:
                    continue
                taken_at, reason = _parse_frame_name(n)
                frames.append({
                    "id": n,
                    "url": f"{_supabase_url()}/storage/v1{url}",
                    "takenAt": taken_at,
                    "reason": reason,
                })
        _listing_cache[bed_id] = (time.monotonic() + LISTING_CACHE_SEC, limit, frames)

    seen = _last_seen.get(bed_id)
    return {
        "bedId": bed_id,
        "online": seen is not None and time.time() - seen < ONLINE_WINDOW_SEC,
        "lastSeen": datetime.fromtimestamp(seen, timezone.utc).isoformat().replace("+00:00", "Z") if seen else None,
        "rssiDbm": _last_rssi.get(bed_id),
        "captureRequested": bed_id in _pending,
        "frames": frames,
        "health": _get_health(bed_id),
        "healthChecking": bed_id in _health_running,
    }


@router.post("/api/camera/{bed_id}/capture", dependencies=[Depends(require_user)])
def capture_now(bed_id: int):
    """Queue a fresh photo; the camera picks it up within ~20 s."""
    _check_bed(bed_id)
    request_capture(bed_id, "requested")
    return {"captureRequested": True}


@router.post("/api/camera/{bed_id}/health-check", dependencies=[Depends(require_user)])
def health_check_now(bed_id: int):
    """Diagnose the latest photo now. Synchronous (~5-15 s): the app waits for it."""
    _check_bed(bed_id)
    since = time.monotonic() - _last_manual_check.get(bed_id, -1e9)
    if since < MANUAL_CHECK_COOLDOWN_SEC:
        wait = int(MANUAL_CHECK_COOLDOWN_SEC - since)
        raise HTTPException(
            status_code=429,
            detail=f"The bed was checked moments ago. Try again in {max(1, wait // 60)} min.",
        )

    listing = _storage(
        "POST", f"/object/list/{BUCKET}",
        json={"prefix": f"bed{bed_id}/", "limit": 1, "offset": 0,
              "sortBy": {"column": "name", "order": "desc"}},
    ).json()
    names = [o["name"] for o in listing if o.get("name", "").endswith(".jpg")]
    if not names:
        raise HTTPException(status_code=404, detail="No camera photo to check yet")

    jpeg = _storage("GET", f"/object/authenticated/{BUCKET}/bed{bed_id}/{names[0]}").content
    _last_manual_check[bed_id] = time.monotonic()
    return {"health": run_health_check(bed_id, jpeg, names[0], "manual")}
