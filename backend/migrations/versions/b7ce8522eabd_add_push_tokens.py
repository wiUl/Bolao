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




def upgrade() -> None:
    op.create_table(
        "push_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=512), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "token", name="uq_push_token_user_token"),
    )
    op.create_index("ix_push_tokens_user_id", "push_tokens", ["user_id"])
    op.create_index("ix_push_tokens_token", "push_tokens", ["token"])


def downgrade() -> None:
    op.drop_index("ix_push_tokens_token", table_name="push_tokens")
    op.drop_index("ix_push_tokens_user_id", table_name="push_tokens")
    op.drop_table("push_tokens")