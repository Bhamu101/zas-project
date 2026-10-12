"""One place where this backend talks to Gemini.

The assistant (main.py) and the crop-health diagnosis (diagnosis.py) both call
the same API, and both used to do it the same naive way: one shot, no timeout,
give up on the first error. That produces two bad failure modes, and the farmer
sees both as "the AI is broken":

  1. "This model is currently experiencing high demand." Gemini returns 503
     routinely when a model is busy. It is almost always transient, and the
     right response is to wait a moment and ask again rather than to fail.

  2. A request that hangs. Without an explicit timeout the SDK can sit on a
     stalled call far longer than anyone will wait, holding a worker the whole
     time. A bounded wait that fails honestly beats an unbounded one.

So every call goes through generate() below, which bounds each attempt, retries
a busy model a couple of times with backoff, and then falls back to the next
model in the chain before giving up.

Models are configurable without touching code:
    GEMINI_MODEL            primary (default below)
    GEMINI_FALLBACK_MODELS  comma-separated, tried in order after the primary

Env is read per call, not at import, for the same reason as auth.py: main.py
imports this module before load_dotenv() has run.
"""

import os
import time

from fastapi import HTTPException
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

DEFAULT_MODEL = "gemini-3.6-flash"
DEFAULT_FALLBACKS = "gemini-3.5-flash,gemini-flash-latest"

# Per-attempt ceiling. Long enough for a vision call on a large photo, short
# enough that a stalled request still returns an answer the UI can show.
REQUEST_TIMEOUT_MS = 45_000

ATTEMPTS_PER_MODEL = 2
BACKOFF_SEC = (1.5, 4.0)

MISSING_KEY_DETAIL = (
    "GEMINI_API_KEY is not set on the server. Copy backend/.env.example to "
    "backend/.env and add your key."
)
BAD_KEY_DETAIL = (
    "GEMINI_API_KEY is missing or invalid on the server (set it in backend/.env)."
)


def require_key() -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail=MISSING_KEY_DETAIL)
    return key


def model_chain() -> list[str]:
    primary = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    raw = os.environ.get("GEMINI_FALLBACK_MODELS", DEFAULT_FALLBACKS)
    chain = [primary]
    for name in (m.strip() for m in raw.split(",")):
        if name and name not in chain:
            chain.append(name)
    return chain


def _client() -> genai.Client:
    return genai.Client(
        api_key=require_key(),
        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
    )


def generate(contents, config=None, what: str = "Request"):
    """Call Gemini with retries and model fallback.

    Raises HTTPException with a message fit to show a farmer. `what` names the
    operation, e.g. "Assistant request" or "Diagnosis request".
    """
    client = _client()
    last_busy = None       # the most recent transient failure, for the message
    rate_limited = False

    for model in model_chain():
        for attempt in range(ATTEMPTS_PER_MODEL):
            try:
                return client.models.generate_content(
                    model=model, contents=contents, config=config
                )
            except genai_errors.ClientError as e:
                if e.code in (401, 403):
                    raise HTTPException(status_code=500, detail=BAD_KEY_DETAIL)
                if e.code == 429:
                    # Quota on this model. Backing off will not help; the next
                    # model in the chain might have headroom.
                    rate_limited = True
                    last_busy = e
                    break
                if e.code == 404:
                    # Model name not available to this key — try the next one.
                    last_busy = e
                    break
                raise HTTPException(status_code=502, detail=f"{what} failed: {e.message}")
            except genai_errors.ServerError as e:
                # 500/503 — busy or a hiccup. Worth another go.
                last_busy = e
                if attempt + 1 < ATTEMPTS_PER_MODEL:
                    time.sleep(BACKOFF_SEC[attempt])
            except Exception as e:
                # Timeout / transport failure. Same treatment.
                last_busy = e
                if attempt + 1 < ATTEMPTS_PER_MODEL:
                    time.sleep(BACKOFF_SEC[attempt])

    tried = ", ".join(model_chain())
    if rate_limited:
        raise HTTPException(
            status_code=429,
            detail=f"{what} hit the Gemini rate limit on every model ({tried}). "
                   "Wait a moment and try again.",
        )
    detail = getattr(last_busy, "message", None) or str(last_busy) or "no response"
    raise HTTPException(
        status_code=502,
        detail=f"{what} failed — Gemini was busy or unreachable on every model "
               f"tried ({tried}). Last error: {detail}",
    )
