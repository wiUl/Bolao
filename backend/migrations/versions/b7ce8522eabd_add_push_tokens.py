"""add push_tokens

Revision ID: b7ce8522eabd
Revises: c873da557771
Create Date: 2026-01-12 17:02:07.523510
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7ce8522eabd"
down_revision: Union[str, Sequence[str], None] = "c873da557771"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "push_alerts_log"
OLD_UQ_NAME = "uq_push_alert_jogo_liga_tipo"          # <- se o nome antigo for outro, ajuste aqui
NEW_UQ_NAME = "uq_push_alert_jogo_tipo"


def upgrade() -> None:
    # SQLite: para mexer em constraints com segurança, use batch_alter_table
    with op.batch_alter_table(TABLE_NAME, schema=None) as batch_op:
        # 1) adicionar coluna liga_id (nullable=True primeiro para não quebrar dados existentes)
        batch_op.add_column(sa.Column("liga_id", sa.Integer(), nullable=True))

        # 2) dropar UNIQUE antiga (ajuste o nome se necessário)
        batch_op.drop_constraint(OLD_UQ_NAME, type_="unique")

        # 3) criar UNIQUE nova (jogo_id, liga_id, alert_type)
        batch_op.create_unique_constraint(
            NEW_UQ_NAME,
            ["jogo_id", "liga_id", "alert_type"],
        )

    # Se você já tem registros na tabela, você PRECISA preencher liga_id antes de torná-la NOT NULL.
    # Exemplo (se fizer sentido): setar liga_id = 0/1 ou buscar de outro lugar.
    # op.execute(f"UPDATE {TABLE_NAME} SET liga_id = <algum_valor> WHERE liga_id IS NULL")

    # Se você quiser deixar liga_id NOT NULL como no model, faça isso SÓ depois de preencher,
    # e também via batch (SQLite recria tabela):
    # with op.batch_alter_table(TABLE_NAME, schema=None) as batch_op:
    #     batch_op.alter_column("liga_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table(TABLE_NAME, schema=None) as batch_op:
        # desfaz UNIQUE nova
        batch_op.drop_constraint(NEW_UQ_NAME, type_="unique")

        # recria UNIQUE antiga (ajuste as colunas conforme era antes)
        batch_op.create_unique_constraint(
            OLD_UQ_NAME,
            ["jogo_id", "alert_type"],
        )

        # remove coluna liga_id
        batch_op.drop_column("liga_id")
