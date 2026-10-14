"""user roles, permissions and admin audit log

Revision ID: 0003
Revises: 0002
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

Json = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("role", sa.String(length=16), nullable=False, server_default="user"))
        batch_op.add_column(sa.Column("permissions", Json, nullable=True))
    op.create_table(
        "admin_audit",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer(), "sqlite"), autoincrement=True, nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actor_user_id", sa.String(length=32), nullable=False),
        sa.Column("actor_email", sa.String(length=320), nullable=True),
        sa.Column("action", sa.String(length=48), nullable=False),
        sa.Column("target_user_id", sa.String(length=32), nullable=True),
        sa.Column("target_email", sa.String(length=320), nullable=True),
        sa.Column("details", Json, nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("admin_audit", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_admin_audit_at"), ["at"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("admin_audit", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_admin_audit_at"))
    op.drop_table("admin_audit")
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("permissions")
        batch_op.drop_column("role")
