"""add personal homework, moderation and participants

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b8
Create Date: 2026-11-27 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: str | Sequence[str] | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Alter columns on homeworks
    op.alter_column("homeworks", "group_id", nullable=True)
    op.alter_column("homeworks", "deadline", nullable=True)

    op.add_column(
        "homeworks",
        sa.Column(
            "is_personal",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column(
        "homeworks",
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'approved'"),
            nullable=False,
        ),
    )
    op.add_column(
        "homeworks",
        sa.Column(
            "target_type",
            sa.String(length=32),
            server_default=sa.text("'all'"),
            nullable=False,
        ),
    )
    op.add_column(
        "homeworks",
        sa.Column("moderation_comment", sa.Text(), nullable=True),
    )
    op.add_column(
        "homeworks",
        sa.Column("approved_by_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "homeworks",
        sa.Column("edited_by_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "homeworks",
        sa.Column("submitted_to_group_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        op.f("ix_homeworks_is_personal"),
        "homeworks",
        ["is_personal"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homeworks_status"),
        "homeworks",
        ["status"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_homeworks_approved_by_id_users"),
        "homeworks",
        "users",
        ["approved_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("fk_homeworks_edited_by_id_users"),
        "homeworks",
        "users",
        ["edited_by_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create homework_participants table
    op.create_table(
        "homework_participants",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("homework_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "is_submitted",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("marked_by_id", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["homework_id"],
            ["homeworks.id"],
            name=op.f("fk_homework_participants_homework_id_homeworks"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_homework_participants_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["marked_by_id"],
            ["users.id"],
            name=op.f("fk_homework_participants_marked_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_homework_participants")),
        sa.UniqueConstraint("homework_id", "user_id", name="uq_homework_participant"),
    )
    op.create_index(
        op.f("ix_homework_participants_homework_id"),
        "homework_participants",
        ["homework_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homework_participants_user_id"),
        "homework_participants",
        ["user_id"],
        unique=False,
    )

    # Create homework_completions table
    op.create_table(
        "homework_completions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("homework_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["homework_id"],
            ["homeworks.id"],
            name=op.f("fk_homework_completions_homework_id_homeworks"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_homework_completions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_homework_completions")),
        sa.UniqueConstraint(
            "homework_id", "user_id", name="uq_homework_user_completion"
        ),
    )
    op.create_index(
        op.f("ix_homework_completions_homework_id"),
        "homework_completions",
        ["homework_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_homework_completions_user_id"),
        "homework_completions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("homework_completions")
    op.drop_table("homework_participants")

    op.drop_constraint(
        op.f("fk_homeworks_edited_by_id_users"), "homeworks", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("fk_homeworks_approved_by_id_users"), "homeworks", type_="foreignkey"
    )
    op.drop_index(op.f("ix_homeworks_status"), table_name="homeworks")
    op.drop_index(op.f("ix_homeworks_is_personal"), table_name="homeworks")

    op.drop_column("homeworks", "submitted_to_group_at")
    op.drop_column("homeworks", "edited_by_id")
    op.drop_column("homeworks", "approved_by_id")
    op.drop_column("homeworks", "moderation_comment")
    op.drop_column("homeworks", "target_type")
    op.drop_column("homeworks", "status")
    op.drop_column("homeworks", "is_personal")

    op.alter_column("homeworks", "deadline", nullable=False)
    op.alter_column("homeworks", "group_id", nullable=False)
