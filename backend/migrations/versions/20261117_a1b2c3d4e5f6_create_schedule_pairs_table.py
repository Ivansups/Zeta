"""create schedule_pairs table

Revision ID: a1b2c3d4e5f6
Revises: 97cb95a47a7e
Create Date: 2026-11-17 00:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "97cb95a47a7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "schedule_pairs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("group_id", sa.UUID(), nullable=False),
        sa.Column("subgroup", sa.Integer(), nullable=True),
        sa.Column("day_of_week", sa.String(length=32), nullable=False),
        sa.Column("pair_number", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.String(length=8), nullable=False),
        sa.Column("end_time", sa.String(length=8), nullable=False),
        sa.Column("week_parity", sa.String(length=16), nullable=False),
        sa.Column("subject", sa.String(length=256), nullable=False),
        sa.Column("subject_id", sa.String(length=64), nullable=True),
        sa.Column("teacher", sa.String(length=128), nullable=True),
        sa.Column("teacher_title", sa.String(length=64), nullable=True),
        sa.Column("room", sa.String(length=64), nullable=True),
        sa.Column("building", sa.String(length=128), nullable=True),
        sa.Column("is_online", sa.Boolean(), nullable=False),
        sa.Column("lesson_type", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name=op.f("fk_schedule_pairs_group_id_groups"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_schedule_pairs")),
        sa.UniqueConstraint(
            "group_id",
            "day_of_week",
            "pair_number",
            "week_parity",
            "subgroup",
            "subject",
            name="uq_schedule_pair_slot",
        ),
    )
    op.create_index(
        op.f("ix_schedule_pairs_day_of_week"),
        "schedule_pairs",
        ["day_of_week"],
        unique=False,
    )
    op.create_index(
        op.f("ix_schedule_pairs_group_id"),
        "schedule_pairs",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_schedule_pairs_pair_number"),
        "schedule_pairs",
        ["pair_number"],
        unique=False,
    )
    op.create_index(
        op.f("ix_schedule_pairs_subgroup"),
        "schedule_pairs",
        ["subgroup"],
        unique=False,
    )
    op.create_index(
        op.f("ix_schedule_pairs_subject"),
        "schedule_pairs",
        ["subject"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_schedule_pairs_subject"), table_name="schedule_pairs")
    op.drop_index(op.f("ix_schedule_pairs_subgroup"), table_name="schedule_pairs")
    op.drop_index(op.f("ix_schedule_pairs_pair_number"), table_name="schedule_pairs")
    op.drop_index(op.f("ix_schedule_pairs_group_id"), table_name="schedule_pairs")
    op.drop_index(op.f("ix_schedule_pairs_day_of_week"), table_name="schedule_pairs")
    op.drop_table("schedule_pairs")
