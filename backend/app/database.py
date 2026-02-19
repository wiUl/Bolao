import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bolao.db")

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {
        "prepare_threshold": None,  # Necessário para pgbouncer/supabase pooler
        "connect_timeout": 10,
        # Keepalives para evitar conexões mortas em idle
        "keepalives": 1,
        "keepalives_idle": 60,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        # SSL via sslmode no psycopg3 vai dentro de conninfo, então use assim:
        "sslmode": "require",
    }

    # Se estiver no Render free tier (app hiberna), NullPool é mais seguro
    USE_NULL_POOL = os.getenv("USE_NULL_POOL", "false").lower() == "true"

    if USE_NULL_POOL:
        engine_kwargs["poolclass"] = NullPool
    else:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_size": int(os.getenv("DB_POOL_SIZE", "3")),       # Reduzido: Supabase free tem limite
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "5")), # Reduzido também
            "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
            "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "240")),  # ✅ 4 min (abaixo do timeout do Supabase)
        })

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
    **engine_kwargs,
)

# ✅ Log para debugar quando conexões são descartadas/recriadas
@event.listens_for(engine, "connect")
def on_connect(dbapi_connection, connection_record):
    logger.info("Nova conexão estabelecida com o banco")

@event.listens_for(engine, "checkout")
def on_checkout(dbapi_connection, connection_record, connection_proxy):
    logger.debug("Conexão retirada do pool")

@event.listens_for(engine, "invalidate")
def on_invalidate(dbapi_connection, connection_record, exception):
    logger.warning(f"Conexão invalidada: {exception}")

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

Base = declarative_base()