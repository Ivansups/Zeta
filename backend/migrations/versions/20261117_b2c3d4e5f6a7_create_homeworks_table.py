"""create homeworks table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-17 00:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "homeworks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("group_id", sa.UUID(), nullable=False),
        sa.Column("schedule_pair_id", sa.UUID(), nullable=True),
        sa.Column("subgroup", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("subject", sa.String(length=256), nullable=True),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name=op.f("fk_homeworks_created_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name=op.f("fk_homeworks_group_id_groups"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["schedule_pair_id"],
            ["schedule_pairs.id"],
            name=op.f("fk_homeworks_schedule_pair_id_schedule_pairs"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_homeworks")),
    )
    op.create_index(
        op.f("ix_homeworks_deadline"),
        "homeworks",
        ["deadline"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homeworks_group_id"),
        "homeworks",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homeworks_schedule_pair_id"),
        "homeworks",
        ["schedule_pair_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homeworks_subgroup"),
        "homeworks",
        ["subgroup"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_homeworks_subgroup"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_schedule_pair_id"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_group_id"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_deadline"), table_name="homeworks")
    op.drop_table("homeworks")
