from logging.config import fileConfig
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# ================================
# Carregar .env da raiz do projeto
# ================================
BASE_DIR = Path(__file__).resolve().parents[2]  # .../Projetos/Bolao
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL não está definida no ambiente (.env)")

# ================================
# Alembic Config
# ================================
config = context.config

# NUNCA use set_main_option aqui, porque quebra com '%' (ex: %23) via configparser
# config.set_main_option("sqlalchemy.url", str(DATABASE_URL))  # <- REMOVER

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ================================
# Importar metadata (models)
# ================================
from app.database import Base  # não importa engine do app
import app.models  # garante que todos os models foram importados

target_metadata = Base.metadata

# ================================
# Offline migrations
# ================================
def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    """
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()

# ================================
# Online migrations
# ================================
def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    """
    connectable = engine_from_config(
        {"sqlalchemy.url": DATABASE_URL},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True if connection.dialect.name == "sqlite" else False,
        )

        with context.begin_transaction():
            context.run_migrations()

# ================================
# Entry point
# ================================
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
