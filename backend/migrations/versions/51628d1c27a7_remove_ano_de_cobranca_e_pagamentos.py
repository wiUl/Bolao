"""remove ano de cobranca e pagamentos

Revision ID: 51628d1c27a7
Revises: f56ca1951876
Create Date: 2026-01-13 16:05:47.280774

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51628d1c27a7'
down_revision: Union[str, Sequence[str], None] = 'f56ca1951876'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # --- liga_cobranca_meses ---
    # Drop UNIQUE que contém (liga_id, ano, mes) sem depender do nome
    op.execute("""
    DO $$
    DECLARE c_name text;
    BEGIN
      SELECT c.conname INTO c_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname='public'
        AND t.relname='liga_cobranca_meses'
        AND c.contype='u'
        AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, ano, mes)'
      LIMIT 1;

      IF c_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.liga_cobranca_meses DROP CONSTRAINT %I', c_name);
      END IF;
    END $$;
    """)

    # Remove coluna ano (se existir)
    op.execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='liga_cobranca_meses'
          AND column_name='ano'
      ) THEN
        ALTER TABLE public.liga_cobranca_meses DROP COLUMN ano;
      END IF;
    END $$;
    """)

    # Cria UNIQUE novo (liga_id, mes) se não existir
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname='public'
          AND t.relname='liga_cobranca_meses'
          AND c.contype='u'
          AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, mes)'
      ) THEN
        ALTER TABLE public.liga_cobranca_meses
          ADD CONSTRAINT uq_liga_cobranca_mes UNIQUE (liga_id, mes);
      END IF;
    END $$;
    """)

    # (opcional) remover índice de ano se existir (não falha)
    op.execute("DROP INDEX IF EXISTS public.ix_liga_cobranca_ano;")

    # --- liga_pagamentos ---
    # Drop UNIQUE que contém (liga_id, usuario_id, ano, mes) sem depender do nome
    op.execute("""
    DO $$
    DECLARE c_name text;
    BEGIN
      SELECT c.conname INTO c_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname='public'
        AND t.relname='liga_pagamentos'
        AND c.contype='u'
        AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, usuario_id, ano, mes)'
      LIMIT 1;

      IF c_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.liga_pagamentos DROP CONSTRAINT %I', c_name);
      END IF;
    END $$;
    """)

    # Remove coluna ano (se existir)
    op.execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='liga_pagamentos'
          AND column_name='ano'
      ) THEN
        ALTER TABLE public.liga_pagamentos DROP COLUMN ano;
      END IF;
    END $$;
    """)

    # Cria UNIQUE novo (liga_id, usuario_id, mes) se não existir
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname='public'
          AND t.relname='liga_pagamentos'
          AND c.contype='u'
          AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, usuario_id, mes)'
      ) THEN
        ALTER TABLE public.liga_pagamentos
          ADD CONSTRAINT uq_liga_pagamento UNIQUE (liga_id, usuario_id, mes);
      END IF;
    END $$;
    """)

    op.execute("DROP INDEX IF EXISTS public.ix_liga_pagamento_ano;")


def downgrade():
    # downgrade “melhor esforço”: readiciona ano (nullable) e tenta voltar uniques
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='liga_cobranca_meses'
          AND column_name='ano'
      ) THEN
        ALTER TABLE public.liga_cobranca_meses ADD COLUMN ano integer;
      END IF;
    END $$;
    """)

    op.execute("""
    DO $$
    DECLARE c_name text;
    BEGIN
      SELECT c.conname INTO c_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname='public'
        AND t.relname='liga_cobranca_meses'
        AND c.contype='u'
        AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, mes)'
      LIMIT 1;

      IF c_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.liga_cobranca_meses DROP CONSTRAINT %I', c_name);
      END IF;
    END $$;
    """)

    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname='public'
          AND t.relname='liga_cobranca_meses'
          AND c.contype='u'
          AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, ano, mes)'
      ) THEN
        ALTER TABLE public.liga_cobranca_meses
          ADD CONSTRAINT uq_liga_cobranca_mes UNIQUE (liga_id, ano, mes);
      END IF;
    END $$;
    """)

    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='liga_pagamentos'
          AND column_name='ano'
      ) THEN
        ALTER TABLE public.liga_pagamentos ADD COLUMN ano integer;
      END IF;
    END $$;
    """)

    op.execute("""
    DO $$
    DECLARE c_name text;
    BEGIN
      SELECT c.conname INTO c_name
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname='public'
        AND t.relname='liga_pagamentos'
        AND c.contype='u'
        AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, usuario_id, mes)'
      LIMIT 1;

      IF c_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.liga_pagamentos DROP CONSTRAINT %I', c_name);
      END IF;
    END $$;
    """)

    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname='public'
          AND t.relname='liga_pagamentos'
          AND c.contype='u'
          AND pg_get_constraintdef(c.oid) = 'UNIQUE (liga_id, usuario_id, ano, mes)'
      ) THEN
        ALTER TABLE public.liga_pagamentos
          ADD CONSTRAINT uq_liga_pagamento UNIQUE (liga_id, usuario_id, ano, mes);
      END IF;
    END $$;
    """)