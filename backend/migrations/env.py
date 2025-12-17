from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ================================
# Alembic Config
# ================================
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ================================
# IMPORTANTE: importar Base + engine do app
# ================================
from app.database import Base, engine

# IMPORTANTE: importar TODOS os models
# Isso garante que Base.metadata esteja populado
import app.models  # noqa: F401

# Metadata que o Alembic vai usar
target_metadata = Base.metadata


# ================================
# Offline migrations
# ================================
def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    """
    url = str(engine.url)
    context.configure(
        url=url,
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
    connectable = engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True if engine.dialect.name == "sqlite" else False,
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
