"""initial empty revision

Revision ID: d02c822569f7
Revises:
Create Date: 2026-10-07 19:48:40.126012

"""

from collections.abc import Sequence

revision: str = "d02c822569f7"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""
