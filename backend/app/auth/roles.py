"""Roles and permissions.

Three levels: `user` (nothing special), `admin` (only the permissions a super admin granted) and
`super_admin` (everything, including promoting admins). A super admin is whoever signs in with a
verified Google email listed in SUPER_ADMIN_EMAILS: it cannot be granted or removed from the app,
so nobody can lock the owner out or escalate to it."""

from __future__ import annotations

from typing import Any

from app.core.config import Settings

# permission -> what it allows (also shown to the super admin when granting).
PERMISSIONS: dict[str, str] = {
    "view_users": "Vedere l'elenco degli utenti registrati",
    "refresh_data": "Aggiornare partite e predizioni (Calcio e Tennis)",
    "free_access": "Accesso gratuito a tutte le funzioni a pagamento (quando ci saranno gli abbonamenti)",
}


def is_super_admin(user: Any, settings: Settings) -> bool:
    email = (getattr(user, "email", None) or "").strip().lower()
    return bool(email) and email in settings.super_admin_email_set


def effective_role(user: Any, settings: Settings) -> str:
    if is_super_admin(user, settings):
        return "super_admin"
    return "admin" if getattr(user, "role", "user") == "admin" else "user"


def effective_permissions(user: Any, settings: Settings) -> list[str]:
    role = effective_role(user, settings)
    if role == "super_admin":
        return sorted(PERMISSIONS)
    if role == "admin":
        return sorted(p for p in (user.permissions or []) if p in PERMISSIONS)
    return []


def has_permission(user: Any, settings: Settings, permission: str) -> bool:
    return permission in effective_permissions(user, settings)
