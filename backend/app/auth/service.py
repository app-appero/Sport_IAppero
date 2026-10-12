from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth.google import GoogleProfile
from app.db.models import User, UserIdentity


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def sign_in_google(maker: async_sessionmaker[AsyncSession], profile: GoogleProfile) -> User:
    """Find the user for this Google account or create it. Safe under concurrent first logins."""
    for attempt in (1, 2):
        try:
            async with maker() as session:
                identity = await session.scalar(
                    select(UserIdentity).where(
                        UserIdentity.provider == "google", UserIdentity.subject == profile.subject
                    )
                )
                now = _now()
                if identity is None:
                    user = User(
                        id=uuid.uuid4().hex,
                        display_name=profile.name,
                        email=profile.email,
                        avatar_url=profile.picture,
                        created_at=now,
                        last_login_at=now,
                    )
                    session.add(user)
                    await session.flush()
                    session.add(
                        UserIdentity(
                            user_id=user.id, provider="google", subject=profile.subject, created_at=now
                        )
                    )
                else:
                    user = await session.get(User, identity.user_id)
                    user.last_login_at = now
                    # Google is the source of truth for these; keep them fresh.
                    user.display_name = profile.name or user.display_name
                    user.email = profile.email or user.email
                    user.avatar_url = profile.picture or user.avatar_url
                await session.commit()
                return user
        except IntegrityError:
            if attempt == 2:
                raise
    raise RuntimeError("unreachable")


async def get_user(maker: async_sessionmaker[AsyncSession], user_id: str) -> User | None:
    async with maker() as session:
        return await session.get(User, user_id)


async def delete_user(maker: async_sessionmaker[AsyncSession], user_id: str) -> bool:
    """Remove the account and every identity. Returns False if it did not exist."""
    async with maker() as session:
        user = await session.get(User, user_id)
        if user is None:
            return False
        await session.execute(delete(UserIdentity).where(UserIdentity.user_id == user_id))
        await session.delete(user)
        await session.commit()
        return True
