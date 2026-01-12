"""add timezone to jogo data_hora

Revision ID: f56ca1951876
Revises: bce314ffc011
Create Date: 2026-01-12 18:14:41.456928

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f56ca1951876'
down_revision: Union[str, Sequence[str], None] = 'bce314ffc011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    with op.batch_alter_table("jogos") as batch_op:
        batch_op.alter_column(
            "data_hora",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )

def downgrade():
    with op.batch_alter_table("jogos") as batch_op:
        batch_op.alter_column(
            "data_hora",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )