"""Persistence schema (Sprint 3). Append-only revisions; settlements are the only mutable rows."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# JSONB on PostgreSQL, plain JSON elsewhere (tests run on SQLite).
Json = JSON().with_variant(JSONB(), "postgresql")
# SQLite only autoincrements INTEGER primary keys.
PkInt = BigInteger().with_variant(Integer(), "sqlite")


class Base(DeclarativeBase):
    pass


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (UniqueConstraint("provider", "source_event_id", name="uq_events_provider_source"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # "football:1579486"
    sport: Mapped[str] = mapped_column(String(32), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    source_event_id: Mapped[str] = mapped_column(String(64))
    # Names are optional: the official ledger has no team registry and we never invent one.
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    competition_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    competition_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    participants: Mapped[list | None] = mapped_column(Json, nullable=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PredictionRevision(Base):
    """One immutable observation/publication of a prediction. Never updated."""

    __tablename__ = "prediction_revisions"
    __table_args__ = (
        UniqueConstraint("logical_id", "content_hash", name="uq_revisions_logical_hash"),
        # Provider publication identity (e.g. ledger id_prediction). NULLs stay distinct.
        UniqueConstraint("source", "source_ref", name="uq_revisions_source_ref"),
        Index("ix_revisions_event_market", "event_id", "market"),
        Index("ix_revisions_kickoff", "sport", "kickoff_at"),
    )

    id: Mapped[int] = mapped_column(PkInt, primary_key=True, autoincrement=True)
    logical_id: Mapped[str] = mapped_column(String(160))
    content_hash: Mapped[str] = mapped_column(String(64))
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"))
    sport: Mapped[str] = mapped_column(String(32))
    # "feed_observed": seen by the BFF in a live feed. "soccer_official": provider official ledger.
    source: Mapped[str] = mapped_column(String(32), index=True)
    source_ref: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_official: Mapped[bool] = mapped_column(Boolean, default=False)

    market: Mapped[str] = mapped_column(String(64))
    line: Mapped[str | None] = mapped_column(String(16), nullable=True)
    period: Mapped[str | None] = mapped_column(String(32), nullable=True)
    selection: Mapped[str] = mapped_column(String(128))
    probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    odds: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(128), nullable=True)
    decision: Mapped[str | None] = mapped_column(String(32), nullable=True)

    kickoff_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Ledger: provider captured_at. Feed: first time the BFF saw this content.
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # True only when published/observed strictly before kickoff; None when kickoff unknown.
    pre_match: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    payload: Mapped[dict | None] = mapped_column(Json, nullable=True)


class PredictionSettlement(Base):
    __tablename__ = "prediction_settlements"

    revision_id: Mapped[int] = mapped_column(ForeignKey("prediction_revisions.id"), primary_key=True)
    # pending | won | lost | void | not_placed | unknown
    status: Mapped[str] = mapped_column(String(16), index=True)
    source_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_outcome: Mapped[str | None] = mapped_column(String(128), nullable=True)
    pnl: Mapped[float | None] = mapped_column(Float, nullable=True)
    rule_version: Mapped[str] = mapped_column(String(32))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ProviderFetchRun(Base):
    __tablename__ = "provider_fetch_runs"

    id: Mapped[int] = mapped_column(PkInt, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(32))
    endpoint: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(16))
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    item_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)  # message only, never secrets
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class User(Base):
    """App account. Created on first sign-in; deleting it removes the row and its identities."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # uuid4 hex
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # "user" | "admin". Super admins come from SUPER_ADMIN_EMAILS, never from this column.
    role: Mapped[str] = mapped_column(String(16), default="user", server_default="user")
    # Granted permissions for an admin (see app.auth.roles.PERMISSIONS).
    permissions: Mapped[list | None] = mapped_column(Json, nullable=True)


class AdminAudit(Base):
    """Who did what to whom. Append-only; written for every privileged action."""

    __tablename__ = "admin_audit"

    id: Mapped[int] = mapped_column(PkInt, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    actor_user_id: Mapped[str] = mapped_column(String(32))
    actor_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    action: Mapped[str] = mapped_column(String(48))
    target_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    target_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    details: Mapped[dict | None] = mapped_column(Json, nullable=True)


class UserIdentity(Base):
    """One external login (today only Google) linked to a user; provider-agnostic on purpose."""

    __tablename__ = "user_identities"
    __table_args__ = (UniqueConstraint("provider", "subject", name="uq_identity_provider_subject"),)

    id: Mapped[int] = mapped_column(PkInt, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(16))  # "google" (later "apple")
    subject: Mapped[str] = mapped_column(String(128))  # provider's stable user id (`sub`)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
