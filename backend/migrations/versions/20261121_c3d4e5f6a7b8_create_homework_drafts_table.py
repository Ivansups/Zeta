"""create homework_drafts table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-11-21 02:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | Sequence[str] | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "homework_drafts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("group_id", sa.UUID(), nullable=False),
        sa.Column("created_by_id", sa.UUID(), nullable=False),
        sa.Column("subject", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("subgroup", sa.Integer(), nullable=True),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name=op.f("fk_homework_drafts_created_by_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name=op.f("fk_homework_drafts_group_id_groups"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_homework_drafts")),
    )
    op.create_index(
        op.f("ix_homework_drafts_group_id"),
        "homework_drafts",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homework_drafts_created_by_id"),
        "homework_drafts",
        ["created_by_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homework_drafts_expires_at"),
        "homework_drafts",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_homework_drafts_expires_at"), table_name="homework_drafts")
    op.drop_index(op.f("ix_homework_drafts_created_by_id"), table_name="homework_drafts")
    op.drop_index(op.f("ix_homework_drafts_group_id"), table_name="homework_drafts")
    op.drop_table("homework_drafts")
