"""create group_helpers table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-11-27 02:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: str | Sequence[str] | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "group_helpers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("group_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["groups.id"],
            name=op.f("fk_group_helpers_group_id_groups"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_group_helpers_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_group_helpers")),
        sa.UniqueConstraint(
            "group_id", "user_id", name=op.f("uq_group_helpers_group_id_user_id")
        ),
    )
    op.create_index(
        op.f("ix_group_helpers_group_id"),
        "group_helpers",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_group_helpers_user_id"),
        "group_helpers",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_group_helpers_user_id"), table_name="group_helpers")
    op.drop_index(op.f("ix_group_helpers_group_id"), table_name="group_helpers")
    op.drop_table("group_helpers")
