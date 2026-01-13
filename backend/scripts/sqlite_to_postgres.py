import os
from sqlalchemy import create_engine, inspect, text

SQLITE_URL = os.getenv("SQLITE_URL", "sqlite:///./bolao.db")
POSTGRES_URL = os.getenv("DATABASE_URL")  # ex: postgresql+psycopg://...

if not POSTGRES_URL:
    raise RuntimeError("Defina POSTGRES_URL")

sqlite_engine = create_engine(SQLITE_URL, future=True)
pg_engine = create_engine(POSTGRES_URL, future=True, pool_pre_ping=True)

def list_tables_sqlite():
    with sqlite_engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT name
            FROM sqlite_master
            WHERE type='table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)).fetchall()
    return [r[0] for r in rows]

def list_tables_pg():
    with pg_engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname='public'
            ORDER BY tablename
        """)).fetchall()
    return [r[0] for r in rows]

def copy_table(table: str):
    if table == "alembic_version":
        print("- alembic_version: skip")
        return

    # Lê do SQLite
    with sqlite_engine.connect() as sconn:
        rows = sconn.execute(text(f'SELECT * FROM "{table}"')).mappings().all()

    if not rows:
        print(f"- {table}: 0 linhas (skip)")
        return

    # Descobre quais colunas no Postgres são BOOLEAN (de forma automática)
    insp = inspect(pg_engine)
    pg_cols = insp.get_columns(table, schema="public")
    bool_cols = {c["name"] for c in pg_cols if str(c["type"]).lower() in ("boolean", "bool")}

    # Converte 0/1 (ou 0/1/None) do SQLite -> True/False para colunas boolean do Postgres
    if bool_cols:
        fixed = []
        for r in rows:
            d = dict(r)
            for c in bool_cols:
                if c in d and d[c] is not None:
                    # SQLite pode vir 0/1, "0"/"1", etc.
                    if isinstance(d[c], (int, float)):
                        d[c] = bool(d[c])
                    elif isinstance(d[c], str) and d[c] in ("0", "1"):
                        d[c] = (d[c] == "1")
            fixed.append(d)
        rows = fixed

    cols = list(rows[0].keys())
    col_list = ", ".join([f'"{c}"' for c in cols])
    bind_list = ", ".join([f":{c}" for c in cols])

    # Escreve no Postgres (nova conexão/transaction a cada tabela)
    with pg_engine.begin() as pconn:
        pconn.execute(text(f'TRUNCATE TABLE public."{table}" RESTART IDENTITY CASCADE'))
        pconn.execute(
            text(f'INSERT INTO public."{table}" ({col_list}) VALUES ({bind_list})'),
            rows
        )

    print(f"- {table}: {len(rows)} linhas")

def fix_sequences():
    with pg_engine.begin() as conn:
        tables = conn.execute(text("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname='public'
              AND tablename <> 'alembic_version'
        """)).scalars().all()

        for t in tables:
            has_id = conn.execute(text("""
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema='public'
                  AND table_name=:t
                  AND column_name='id'
                LIMIT 1
            """), {"t": t}).scalar()

            if not has_id:
                continue

            conn.execute(text(f"""
            DO $$
            DECLARE
              seq_name text;
              max_id bigint;
            BEGIN
              SELECT pg_get_serial_sequence('public."{t}"', 'id') INTO seq_name;
              IF seq_name IS NOT NULL THEN
                EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM public."{t}"') INTO max_id;
                EXECUTE format('SELECT setval(%L, %s, true)', seq_name, GREATEST(max_id, 1));
              END IF;
            END $$;
            """))


def main():
    sqlite_tables = set(list_tables_sqlite())
    pg_tables = set(list_tables_pg())

    # Só migra tabelas que existem em ambos
    common = [t for t in list_tables_sqlite() if t in pg_tables]

    print("Tabelas em comum:", common)

    # ORDEM IMPORTA (pais -> filhos). Ajuste conforme seu schema real.
    # Se alguma tabela faltar, ela é ignorada automaticamente.
    preferred_order = [
        "usuarios",
        "competicoes",
        "temporadas",
        "times",
        "rodadas",
        "jogos",
        "ligas",
        "liga_membros",
        "palpites",
        "liga_cobranca_meses",
        "liga_pagamentos",
        "push_tokens",
        "push_alerts_log",  # ou push_alert_log, conforme seu schema final
    ]

    ordered = [t for t in preferred_order if t in sqlite_tables and t in pg_tables]
    remaining = [t for t in common if t not in ordered]

    # Migra primeiro a ordem preferida, depois o resto
    for t in ordered + remaining:
        copy_table(t)

    fix_sequences()
    print("OK: migração concluída e sequences ajustadas.")

if __name__ == "__main__":
    main()
