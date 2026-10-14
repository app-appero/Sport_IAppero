"""Administration: users, roles and the "update everything" button.

Every route checks the caller on the server. The app hides the section from non-admins, but that is
only cosmetics: a request without the right permission gets 403 here."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select

from app.api.v1.auth import _auth_ready, current_user
from app.auth import roles
from app.core.config import get_settings
from app.core.exceptions import ProviderError
from app.db.models import AdminAudit, User
from app.services.registry import get_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

SPORTS = ("football", "tennis")
REFRESH_COOLDOWN_SECONDS = 60
_refresh_lock = asyncio.Lock()
_last_refresh_started: float | None = None


def _error(status: int, code: str, message: str, **extra) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message, **extra})


def require_permission(permission: str):
    async def dependency(user=Depends(current_user)):
        if not roles.has_permission(user, get_settings(), permission):
            raise _error(403, "forbidden", "Non hai il permesso per questa azione")
        return user

    return dependency


async def require_super_admin(user=Depends(current_user)):
    if not roles.is_super_admin(user, get_settings()):
        raise _error(403, "forbidden", "Solo il super admin può farlo")
    return user


def _user_row(user: User) -> dict:
    settings = get_settings()
    return {
        "id": user.id,
        "display_name": user.display_name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
        "role": roles.effective_role(user, settings),
        "permissions": roles.effective_permissions(user, settings),
    }


async def _audit(maker, actor: User, action: str, target: User | None = None, details: dict | None = None) -> None:
    async with maker() as session:
        session.add(
            AdminAudit(
                at=datetime.now(UTC),
                actor_user_id=actor.id,
                actor_email=actor.email,
                action=action,
                target_user_id=target.id if target else None,
                target_email=target.email if target else None,
                details=details,
            )
        )
        await session.commit()


@router.get("/permissions")
async def permissions(_=Depends(require_super_admin)) -> dict:
    return {"permissions": [{"key": k, "label": v} for k, v in roles.PERMISSIONS.items()]}


@router.get("/users")
async def list_users(
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _=Depends(require_permission("view_users")),
) -> dict:
    _, maker = _auth_ready()
    async with maker() as session:
        stmt = select(User)
        count = select(func.count()).select_from(User)
        if q:
            like = f"%{q.strip().lower()}%"
            cond = or_(func.lower(User.email).like(like), func.lower(User.display_name).like(like))
            stmt, count = stmt.where(cond), count.where(cond)
        total = await session.scalar(count)
        rows = (
            await session.scalars(stmt.order_by(User.created_at.desc(), User.id).limit(limit).offset(offset))
        ).all()
    return {"total": total or 0, "limit": limit, "offset": offset, "items": [_user_row(u) for u in rows]}


class RoleChange(BaseModel):
    role: Literal["user", "admin"]
    permissions: list[str] = Field(default_factory=list, max_length=20)


@router.put("/users/{user_id}/role")
async def set_role(user_id: str, body: RoleChange, actor=Depends(require_super_admin)) -> dict:
    settings, maker = _auth_ready()
    unknown = [p for p in body.permissions if p not in roles.PERMISSIONS]
    if unknown:
        raise _error(422, "unknown_permission", f"Permesso sconosciuto: {unknown[0]}")
    if user_id == actor.id:
        raise _error(409, "self_change", "Non puoi cambiare il tuo ruolo")
    async with maker() as session:
        target = await session.get(User, user_id)
        if target is None:
            raise _error(404, "not_found", "Utente non trovato")
        if roles.is_super_admin(target, settings):
            raise _error(409, "protected", "Il super admin non si può modificare")
        before = {"role": target.role, "permissions": list(target.permissions or [])}
        target.role = body.role
        target.permissions = sorted(set(body.permissions)) if body.role == "admin" else []
        await session.commit()
        await session.refresh(target)
        row = _user_row(target)
    await _audit(maker, actor, "set_role", target, {"before": before, "after": {
        "role": target.role, "permissions": list(target.permissions or [])}})
    return row


class RefreshRequest(BaseModel):
    sports: list[Literal["football", "tennis"]] = Field(default_factory=lambda: list(SPORTS), min_length=1)


@router.post("/refresh")
async def refresh_all(body: RefreshRequest, actor=Depends(require_permission("refresh_data"))) -> dict:
    """Starts "Aggiorna tutto" on the selected engines (both by default). One run at a time, with a
    short cooldown: the engines spend API-Sports quota on every run."""
    global _last_refresh_started
    _, maker = _auth_ready()
    async with _refresh_lock:
        now = time.monotonic()
        if _last_refresh_started is not None and now - _last_refresh_started < REFRESH_COOLDOWN_SECONDS:
            wait = int(REFRESH_COOLDOWN_SECONDS - (now - _last_refresh_started)) + 1
            raise _error(429, "cooldown", f"Aggiornamento già avviato: riprova tra {wait} secondi",
                         retry_after_seconds=wait)
        _last_refresh_started = now
    results: dict[str, dict] = {}
    for sport in dict.fromkeys(body.sports):
        provider = get_provider(sport)
        if provider is None:
            results[sport] = {"state": "error", "ref": None, "message": "Provider non configurato"}
            continue
        try:
            started = await provider.start_refresh()
            results[sport] = {"state": "started", "ref": started.get("ref"), "message": started.get("message")}
        except ProviderError as exc:
            logger.warning("admin refresh %s failed: %s", sport, exc)
            results[sport] = {"state": "error", "ref": None, "message": "Il motore non ha accettato la richiesta"}
    await _audit(maker, actor, "refresh", None, {"sports": list(results), "states": {
        s: r["state"] for s, r in results.items()}})
    return {"started_at": datetime.now(UTC), "results": results}


@router.get("/refresh/status")
async def refresh_status(
    football: str | None = Query(default=None, max_length=64),
    tennis: str | None = Query(default=None, max_length=64),
    _=Depends(require_permission("refresh_data")),
) -> dict:
    out: dict[str, dict] = {}
    for sport, ref in (("football", football), ("tennis", tennis)):
        if not ref:
            continue
        provider = get_provider(sport)
        try:
            out[sport] = await provider.refresh_status(ref) if provider else {"state": "unknown", "detail": None}
        except ProviderError:
            out[sport] = {"state": "unknown", "detail": "Stato non disponibile"}
    return out


@router.get("/audit")
async def audit(limit: int = Query(default=50, ge=1, le=200), _=Depends(require_super_admin)) -> dict:
    _, maker = _auth_ready()
    async with maker() as session:
        rows = (await session.scalars(select(AdminAudit).order_by(AdminAudit.id.desc()).limit(limit))).all()
    return {"items": [{
        "at": r.at, "actor_email": r.actor_email, "action": r.action, "target_email": r.target_email,
        "details": r.details} for r in rows]}
