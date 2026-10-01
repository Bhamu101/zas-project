// Photos from the ESP32-CAM on the stand (firmware/camera-node/bed1-camera/).
//
// The camera uploads a frame every 30 minutes, after every irrigation cycle,
// and on demand via "Take photo". Frames come back from the backend as
// short-lived signed Supabase Storage URLs, so a plain <img> can load them.

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Leaf } from "lucide-react";

import { apiFetch } from "../../lib/apiClient";
import Card, { CardHeader, CardBody } from "../ui/Card";
import Button from "../ui/Button";
import StatusPill from "../ui/StatusPill";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";

const POLL_MS = 30000;
// While waiting for a requested photo: the camera checks in every ~20 s, then
// needs a few seconds to capture and upload.
const FAST_POLL_MS = 4000;
const CAPTURE_TIMEOUT_MS = 90000;

const REASON_LABEL = {
  scheduled: "Scheduled",
  requested: "Requested",
  irrigation: "After irrigation",
  boot: "Camera started",
};

const HEALTH_LABEL = {
  healthy: "Healthy",
  diseased: "Disease",
  pest: "Pests",
  nutrient_deficiency: "Nutrient deficiency",
  unclear: "Unclear",
};

function healthTone(h) {
  if (h.healthStatus === "healthy") return "ok";
  if (h.healthStatus === "unclear") return "idle";
  return h.severity === "moderate" || h.severity === "high" ? "critical" : "warn";
}

// The AI check of the camera photo: runs automatically once a day around
// midday (backend/camera.py), or on demand.
function HealthCheck({ bedId, health, checking, hasFrames, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function checkNow() {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/camera/${bedId}/health-check`, { method: "POST" });
      await onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const running = busy || checking;
  const isProblem = health && !["healthy", "unclear"].includes(health.healthStatus);

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Leaf size={16} className="shrink-0 text-[var(--color-ok-strong)]" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-[var(--color-ink)]">AI crop check</h4>
        </div>
        {health && (
          <StatusPill
            size="sm"
            tone={healthTone(health)}
            label={health.healthStatus === "healthy" ? "Healthy" : health.condition || HEALTH_LABEL[health.healthStatus]}
          />
        )}
      </div>

      {health ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-2)]">{health.description}</p>
          {isProblem && health.treatment && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-2)]">
              <span className="font-semibold text-[var(--color-ink)]">What to do: </span>
              {health.treatment}
            </p>
          )}
          <p className="mt-2 text-[11px] text-[var(--color-muted)]">
            {health.trigger === "auto" ? "Daily check" : "Checked on request"} · {timeAgo(health.checkedAt)}
            {health.confidencePct != null && ` · ${health.confidencePct}% confidence`}
            {health.severity && health.severity !== "none" && ` · ${health.severity} severity`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          The camera's photo is checked automatically for disease, pests and nutrient problems once a day around midday.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-danger)]" role={err ? "alert" : undefined}>{err}</p>
        <Button variant="ghost" size="sm" icon={Leaf} loading={running} disabled={!hasFrames} onClick={checkNow}>
          {running ? "Checking…" : "Check now"}
        </Button>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}

function formatTaken(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function BedCamera({ bedId = 1, bedName = "Bed 1" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [waiting, setWaiting] = useState(null); // { since, latestId } while a capture is pending
  const [notice, setNotice] = useState(null);
  const cancelled = useRef(false);
  const waitingRef = useRef(null);

  function setWaitingBoth(value) {
    waitingRef.current = value;
    setWaiting(value);
  }

  const load = useCallback(() => {
    return apiFetch(`/api/camera/${bedId}`)
      .then((json) => {
        if (cancelled.current) return;
        setData(json);
        setError(null);

        // Resolve a pending "Take photo": done when a newer frame lands,
        // abandoned after CAPTURE_TIMEOUT_MS so the button can't spin forever.
        const w = waitingRef.current;
        if (!w) return;
        const latestId = json.frames?.[0]?.id ?? null;
        if (latestId && latestId !== w.latestId) {
          setWaitingBoth(null);
          setSelectedId(null); // jump back to the newest frame
        } else if (Date.now() - w.since > CAPTURE_TIMEOUT_MS) {
          setWaitingBoth(null);
          setNotice(
            json.online
              ? "The camera hasn't sent the photo yet — it will appear here when it does."
              : "The camera is offline, so it can't take a photo right now."
          );
        }
      })
      .catch((err) => {
        if (cancelled.current) return;
        setError(err);
      });
  }, [bedId]);

  useEffect(() => {
    cancelled.current = false;
    load();
    const id = setInterval(load, waiting ? FAST_POLL_MS : POLL_MS);
    return () => {
      cancelled.current = true;
      clearInterval(id);
    };
  }, [load, waiting]);

  async function takePhoto() {
    setNotice(null);
    try {
      await apiFetch(`/api/camera/${bedId}/capture`, { method: "POST" });
      setWaitingBoth({ since: Date.now(), latestId: data?.frames?.[0]?.id ?? null });
    } catch (err) {
      setNotice(err.message);
    }
  }

  const frames = data?.frames ?? [];
  const selected = frames.find((f) => f.id === selectedId) ?? frames[0];
  const latest = frames[0];

  const statusPill = data ? (
    data.online ? (
      <StatusPill tone="ok" label="Camera online" size="sm" />
    ) : (
      <StatusPill tone="offline" label="Camera offline" size="sm" />
    )
  ) : null;

  let body;
  if (error && !data) {
    body = (
      <ErrorState
        title="Couldn't load the bed camera"
        message={error.message}
        onRetry={load}
      />
    );
  } else if (!data) {
    body = <Skeleton className="aspect-[4/3] w-full" />;
  } else if (!frames.length) {
    body = (
      <EmptyState
        title="No photos yet"
        message={
          data.online
            ? "The camera is connected. Its first photo should arrive within a minute."
            : "Once the ESP32-CAM on the stand is powered and on WiFi, its photos of the bed will appear here."
        }
      />
    );
  } else {
    body = (
      <>
        <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-neutral-bg)]">
          <img
            src={selected.url}
            alt={`${bedName}, ${formatTaken(selected.takenAt)}`}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs text-white">
            <span className="font-semibold">{formatTaken(selected.takenAt)}</span>
            <span className="opacity-90">{REASON_LABEL[selected.reason] ?? selected.reason}</span>
          </div>
        </div>

        {frames.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Earlier photos">
            {frames.map((f) => {
              const active = f.id === selected.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setSelectedId(f.id)}
                  className={`shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors ${
                    active ? "border-[var(--color-brand)]" : "border-transparent hover:border-[var(--color-border-strong)]"
                  }`}
                  title={formatTaken(f.takenAt)}
                >
                  <img src={f.url} alt="" loading="lazy" className="h-14 w-[75px] object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`${bedName} camera`}
        subtitle={latest ? `Last photo ${timeAgo(latest.takenAt)} · every 30 min` : "Photos of the bed from the stand"}
        action={statusPill}
      />
      <CardBody>
        {body}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            {waiting ? "Waiting for the camera — usually under 30 seconds…" : notice}
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={Camera}
            loading={Boolean(waiting)}
            disabled={!data || (error && !data)}
            onClick={takePhoto}
          >
            {waiting ? "Taking photo" : "Take photo"}
          </Button>
        </div>
        {data && (
          <HealthCheck
            bedId={bedId}
            health={data.health}
            checking={data.healthChecking}
            hasFrames={frames.length > 0}
            onDone={load}
          />
        )}
      </CardBody>
    </Card>
  );
}
