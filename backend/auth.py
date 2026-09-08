"""Supabase JWT verification for the Smart Irrigation API.

The mobile app signs in against Supabase Auth (GoTrue) and sends the resulting
access token as `Authorization: Bearer <jwt>`. We verify that token here against
the project's *public* JWKS — so this backend never sees or stores a password,
and holds no secret capable of minting tokens.

Supabase projects issue ES256 (asymmetric) tokens by default; the signing key is
fetched from the well-known JWKS endpoint and cached by PyJWKClient, which
re-fetches automatically when it sees an unknown `kid` (i.e. after a key
rotation). Set SUPABASE_URL in backend/.env.
"""

import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError

# Tokens are only accepted for this issuer/audience pair. `authenticated` is the
# audience GoTrue stamps on a signed-in user's access token (anonymous/service
# tokens carry a different one), so this also rejects a project's anon key being
# passed off as a user session.
_AUDIENCE = "authenticated"
_ALGORITHMS = ["ES256", "RS256"]

# Falls back to the project this app ships against when SUPABASE_URL isn't set.
# Safe to hardcode: a project URL is public by design — the same value ships
# inside the mobile app and is declared in render.yaml. It is NOT a credential;
# tokens are still verified against that project's public JWKS, and nothing here
# can mint one. The env var always wins, so pointing a deployment at a different
# project needs no code change.
DEFAULT_SUPABASE_URL = "https://ewseaaucyujohlepufpo.supabase.co"

_jwk_client: PyJWKClient | None = None


def _supabase_url() -> str:
    """Read lazily, not at import time.

    main.py imports this module before it calls load_dotenv(), so a module-level
    os.environ read here would always see an empty value and every request would
    500. Reading per-call also means a corrected .env is picked up on reload
    without editing code.
    """
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    return url or DEFAULT_SUPABASE_URL


def _issuer() -> str:
    return f"{_supabase_url()}/auth/v1"


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(f"{_issuer()}/.well-known/jwks.json", cache_keys=True)
    return _jwk_client


# auto_error=False so a *missing* header produces our own 401 with a useful
# message rather than FastAPI's bare "Not authenticated".
_bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """FastAPI dependency: verify the bearer token, return its claims.

    Raises 401 for anything unverifiable. The returned dict's `sub` is the
    Supabase user id — use it when these endpoints eventually need to scope data
    per farm/owner rather than serving one shared demo farm.
    """
    if credentials is None or not credentials.credentials:
        raise _unauthorized("Missing bearer token")

    token = credentials.credentials
    try:
        issuer = _issuer()
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=_ALGORITHMS,
            audience=_AUDIENCE,
            issuer=issuer,
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Session expired — sign in again")
    except PyJWKClientError as e:
        # No signing key matched the token's `kid` — i.e. it wasn't signed by
        # this Supabase project. That's a bad token (401), not an outage. This
        # is the path a forged/alg-confusion token takes, so it must not be
        # mistaken for a transient JWKS failure below.
        raise _unauthorized(f"Token was not signed by this project: {e}")
    except jwt.InvalidTokenError as e:
        raise _unauthorized(f"Invalid token: {e}")
    except HTTPException:
        raise
    except Exception as e:
        # Genuine JWKS fetch/network failures only — a 503 is more honest than a
        # 401 here, since the caller's token may well be fine.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not verify token against Supabase JWKS: {e}",
        )

    return claims
