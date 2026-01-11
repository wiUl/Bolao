from alembic import op
import sqlalchemy as sa

revision = "408609a16fc8"
down_revision = "eb9fbde8e221"  # ou a última revision aplicada no seu banco
branch_labels = None
depends_on = None


def upgrade():
    # 1) liga_cobranca_meses (schema FINAL sem ano)
    op.execute("""
    CREATE TABLE IF NOT EXISTS liga_cobranca_meses (
        id INTEGER NOT NULL,
        liga_id INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        ativo BOOLEAN NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT ck_liga_cobranca_mes_range CHECK (mes >= 1 AND mes <= 12),
        CONSTRAINT uq_liga_cobranca_mes UNIQUE (liga_id, mes),
        FOREIGN KEY(liga_id) REFERENCES ligas (id) ON DELETE CASCADE
    );
    """)

    # 2) liga_pagamentos (schema FINAL sem ano)
    # ATENÇÃO: ajuste colunas para bater 100% com seu model atual.
    op.execute("""
    CREATE TABLE IF NOT EXISTS liga_pagamentos (
        id INTEGER NOT NULL,
        liga_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        pago BOOLEAN NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT ck_liga_pagamento_mes_range CHECK (mes >= 1 AND mes <= 12),
        CONSTRAINT uq_liga_pagamento UNIQUE (liga_id, usuario_id, mes),
        FOREIGN KEY(liga_id) REFERENCES ligas (id) ON DELETE CASCADE,
        FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
    );
    """)

    # (Opcional) se você tinha índices (além de unique), recrie aqui.
    # Exemplo:
    # op.execute("CREATE INDEX IF NOT EXISTS ix_liga_pagamentos_usuario_id ON liga_pagamentos(usuario_id);")


def downgrade():
    # Em repair migration, normalmente o downgrade é opcional.
    # Mas se quiser:
    op.execute("DROP TABLE IF EXISTS liga_pagamentos;")
    op.execute("DROP TABLE IF EXISTS liga_cobranca_meses;")
