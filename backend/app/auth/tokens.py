"""The BFF's own session tokens (HS256). Stateless: validity = signature + expiry + user exists."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt

_ISSUER = "sport-iappero-bff"


class InvalidSession(Exception):
    pass


def issue_session_token(user_id: str, secret: str, ttl_days: int) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    expires = now + timedelta(days=ttl_days)
    token = jwt.encode(
        {"sub": user_id, "iss": _ISSUER, "iat": now, "exp": expires}, secret, algorithm="HS256"
    )
    return token, expires


def read_session_token(token: str, secret: str) -> str:
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            issuer=_ISSUER,
            options={"require": ["exp", "iat", "sub", "iss"]},
        )
    except Exception as exc:  # noqa: BLE001
        raise InvalidSession(type(exc).__name__) from exc
    return str(claims["sub"])
