"""Verify Google ID tokens (RS256, Google's public JWKS). No network call per request:
the key set is cached by PyJWKClient."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class InvalidGoogleToken(Exception):
    """Token is malformed, expired, for another app, or not signed by Google."""


@dataclass(frozen=True)
class GoogleProfile:
    subject: str
    email: str | None
    name: str | None
    picture: str | None


@lru_cache
def _jwk_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(GOOGLE_CERTS_URL, cache_keys=True, lifespan=3600)


def _signing_key(token: str):
    """Separate so tests can supply a local key instead of fetching Google's."""
    return _jwk_client().get_signing_key_from_jwt(token).key


def verify_google_id_token(token: str, audiences: list[str]) -> GoogleProfile:
    if not audiences:
        raise InvalidGoogleToken("no accepted audience configured")
    try:
        claims = jwt.decode(
            token,
            _signing_key(token),
            algorithms=["RS256"],
            audience=audiences,
            leeway=10,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except Exception as exc:  # noqa: BLE001 — every failure means "do not trust this token"
        raise InvalidGoogleToken(type(exc).__name__) from exc
    if claims.get("iss") not in _ISSUERS:
        raise InvalidGoogleToken("bad issuer")
    verified = claims.get("email_verified")
    email_ok = verified is True or str(verified).lower() == "true"
    return GoogleProfile(
        subject=str(claims["sub"]),
        email=claims.get("email") if email_ok else None,
        name=claims.get("name"),
        picture=claims.get("picture"),
    )
