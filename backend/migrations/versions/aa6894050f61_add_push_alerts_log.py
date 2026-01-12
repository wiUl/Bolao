"""add push_alerts_log

Revision ID: aa6894050f61
Revises: b7ce8522eabd
Create Date: 2026-01-12 17:08:50.870239

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa6894050f61'
down_revision: Union[str, Sequence[str], None] = 'b7ce8522eabd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
