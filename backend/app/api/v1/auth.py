import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, Field

from app.auth import google, roles, service
from app.auth.tokens import InvalidSession, issue_session_token, read_session_token
from app.core.config import get_settings
from app.db.session import get_sessionmaker

router = APIRouter(tags=["auth"])


class GoogleLogin(BaseModel):
    id_token: str = Field(min_length=20, max_length=4096)


class UserOut(BaseModel):
    id: str
    display_name: str | None
    email: str | None
    avatar_url: str | None
    created_at: datetime
    role: str = "user"
    permissions: list[str] = Field(default_factory=list)


class SessionOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserOut


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def _auth_ready():
    """(settings, sessionmaker) or a 503: sign-in needs the database and both secrets."""
    settings = get_settings()
    maker = get_sessionmaker()
    if maker is None or not settings.google_audiences or not settings.session_secret:
        raise _error(503, "auth_disabled", "Accesso non disponibile")
    return settings, maker


async def current_user(authorization: str | None = Header(default=None)):
    settings, maker = _auth_ready()
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _error(401, "unauthorized", "Accesso richiesto")
    try:
        user_id = read_session_token(token, settings.session_secret)
    except InvalidSession as exc:
        raise _error(401, "invalid_session", "Sessione scaduta") from exc
    user = await service.get_user(maker, user_id)
    if user is None:  # account deleted: the token must stop working at once
        raise _error(401, "invalid_session", "Sessione non valida")
    return user


def _user_out(user) -> UserOut:
    settings = get_settings()
    return UserOut(
        role=roles.effective_role(user, settings),
        permissions=roles.effective_permissions(user, settings),
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
    )


@router.post("/auth/google", response_model=SessionOut)
async def login_google(body: GoogleLogin) -> SessionOut:
    settings, maker = _auth_ready()
    try:
        # PyJWKClient fetches Google's keys with blocking I/O the first time.
        profile = await asyncio.to_thread(
            google.verify_google_id_token, body.id_token, settings.google_audiences
        )
    except google.InvalidGoogleToken as exc:
        raise _error(401, "invalid_google_token", "Accesso con Google non riuscito") from exc
    user = await service.sign_in_google(maker, profile)
    token, expires = issue_session_token(user.id, settings.session_secret, settings.session_ttl_days)
    return SessionOut(access_token=token, expires_at=expires, user=_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(user=Depends(current_user)) -> UserOut:
    return _user_out(user)


@router.delete("/me", status_code=204)
async def delete_me(user=Depends(current_user)) -> Response:
    _, maker = _auth_ready()
    await service.delete_user(maker, user.id)
    return Response(status_code=204)
