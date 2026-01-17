"""remove redundancia de index do codigo_convite em liga

Revision ID: a383b29a8310
Revises: 51628d1c27a7
Create Date: 2026-01-17 15:07:32.831734

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a383b29a8310'
down_revision: Union[str, Sequence[str], None] = '51628d1c27a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_ligas_codigo_convite", table_name="ligas")

def downgrade() -> None:
    op.create_index(
        "ix_ligas_codigo_convite",
        "ligas",
        ["codigo_convite"],
        unique=False
    )