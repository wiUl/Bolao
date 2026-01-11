from alembic import op
import sqlalchemy as sa

revision = "c873da557771"
down_revision = "408609a16fc8"
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table("liga_pagamentos") as batch:
        batch.add_column(sa.Column("updated_by", sa.Integer(), nullable=True))
        # opcional: se você quiser FK (SQLite pode ser chatinho em batch)
        # batch.create_foreign_key(
        #     "fk_liga_pagamentos_updated_by_usuario",
        #     "usuarios",
        #     ["updated_by"],
        #     ["id"],
        # )

def downgrade():
    with op.batch_alter_table("liga_pagamentos") as batch:
        batch.drop_column("updated_by")
