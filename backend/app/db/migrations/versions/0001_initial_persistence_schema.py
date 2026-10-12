"""initial persistence schema

Revision ID: 0001
Revises: 
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.create_table('events',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('sport', sa.String(length=32), nullable=False),
    sa.Column('provider', sa.String(length=32), nullable=False),
    sa.Column('source_event_id', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=True),
    sa.Column('competition_id', sa.String(length=64), nullable=True),
    sa.Column('competition_name', sa.String(length=255), nullable=True),
    sa.Column('participants', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
    sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider', 'source_event_id', name='uq_events_provider_source')
    )
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_events_sport'), ['sport'], unique=False)
        batch_op.create_index(batch_op.f('ix_events_start_time'), ['start_time'], unique=False)

    op.create_table('provider_fetch_runs',
    sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
    sa.Column('provider', sa.String(length=32), nullable=False),
    sa.Column('endpoint', sa.String(length=128), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('latency_ms', sa.Integer(), nullable=True),
    sa.Column('item_count', sa.Integer(), nullable=True),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('provider_fetch_runs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_provider_fetch_runs_fetched_at'), ['fetched_at'], unique=False)

    op.create_table('prediction_revisions',
    sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
    sa.Column('logical_id', sa.String(length=160), nullable=False),
    sa.Column('content_hash', sa.String(length=64), nullable=False),
    sa.Column('event_id', sa.String(length=64), nullable=False),
    sa.Column('sport', sa.String(length=32), nullable=False),
    sa.Column('source', sa.String(length=32), nullable=False),
    sa.Column('source_ref', sa.String(length=80), nullable=True),
    sa.Column('is_official', sa.Boolean(), nullable=False),
    sa.Column('market', sa.String(length=64), nullable=False),
    sa.Column('line', sa.String(length=16), nullable=True),
    sa.Column('period', sa.String(length=32), nullable=True),
    sa.Column('selection', sa.String(length=128), nullable=False),
    sa.Column('probability', sa.Float(), nullable=True),
    sa.Column('odds', sa.Float(), nullable=True),
    sa.Column('model_name', sa.String(length=64), nullable=True),
    sa.Column('model_version', sa.String(length=128), nullable=True),
    sa.Column('decision', sa.String(length=32), nullable=True),
    sa.Column('kickoff_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('pre_match', sa.Boolean(), nullable=True),
    sa.Column('payload', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.ForeignKeyConstraint(['event_id'], ['events.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('logical_id', 'content_hash', name='uq_revisions_logical_hash'),
    sa.UniqueConstraint('source', 'source_ref', name='uq_revisions_source_ref')
    )
    with op.batch_alter_table('prediction_revisions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_prediction_revisions_observed_at'), ['observed_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_prediction_revisions_source'), ['source'], unique=False)
        batch_op.create_index('ix_revisions_event_market', ['event_id', 'market'], unique=False)
        batch_op.create_index('ix_revisions_kickoff', ['sport', 'kickoff_at'], unique=False)

    op.create_table('prediction_settlements',
    sa.Column('revision_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('source_status', sa.String(length=64), nullable=True),
    sa.Column('settled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('actual_outcome', sa.String(length=128), nullable=True),
    sa.Column('pnl', sa.Float(), nullable=True),
    sa.Column('rule_version', sa.String(length=32), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['revision_id'], ['prediction_revisions.id'], ),
    sa.PrimaryKeyConstraint('revision_id')
    )
    with op.batch_alter_table('prediction_settlements', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_prediction_settlements_status'), ['status'], unique=False)




def downgrade() -> None:

    with op.batch_alter_table('prediction_settlements', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_prediction_settlements_status'))

    op.drop_table('prediction_settlements')
    with op.batch_alter_table('prediction_revisions', schema=None) as batch_op:
        batch_op.drop_index('ix_revisions_kickoff')
        batch_op.drop_index('ix_revisions_event_market')
        batch_op.drop_index(batch_op.f('ix_prediction_revisions_source'))
        batch_op.drop_index(batch_op.f('ix_prediction_revisions_observed_at'))

    op.drop_table('prediction_revisions')
    with op.batch_alter_table('provider_fetch_runs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_provider_fetch_runs_fetched_at'))

    op.drop_table('provider_fetch_runs')
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_events_start_time'))
        batch_op.drop_index(batch_op.f('ix_events_sport'))

    op.drop_table('events')

