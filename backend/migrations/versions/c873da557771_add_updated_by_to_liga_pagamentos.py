"""add updated_by to liga_pagamentos

Revision ID: c873da557771
Revises: 408609a16fc8
Create Date: xxxx-xx-xx
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "c873da557771"
down_revision = "408609a16fc8"
branch_labels = None
depends_on = None


def upgrade():
    # NO-OP: coluna updated_by já existe na criação da tabela em migrations anteriores
    pass


def downgrade():
    # NO-OP
    pass
