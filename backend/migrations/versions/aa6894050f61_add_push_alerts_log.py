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
    op.create_table(
        "push_alerts_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jogo_id", sa.Integer(), nullable=False),
        sa.Column("liga_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["jogo_id"], ["jogos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["liga_id"], ["ligas.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("jogo_id", "liga_id", "alert_type", name="uq_push_alert_jogo_liga_tipo"),
    )
    op.create_index("ix_push_alerts_log_jogo_id", "push_alerts_log", ["jogo_id"])
    op.create_index("ix_push_alerts_log_liga_id", "push_alerts_log", ["liga_id"])


def downgrade() -> None:
    op.drop_index("ix_push_alerts_log_liga_id", table_name="push_alerts_log")
    op.drop_index("ix_push_alerts_log_jogo_id", table_name="push_alerts_log")
    op.drop_table("push_alerts_log")