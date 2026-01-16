import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bolao.db")

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # psycopg3: desativa prepare statements problemáticos em poolers
    # (pode manter)
    connect_args = {
        "prepare_threshold": None,

        # TLS (Supabase): seguro e recomendado
        "sslmode": "require",

        # Keepalive ajuda MUITO em cloud + pooler (evita conexão morrer em idle)
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

    # Pool tuning (evita timeouts e conexões zumbis)
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "900")),  # 15 min
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
    **engine_kwargs,
)

Sessionlocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def get_db():
    db = Sessionlocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

Base = declarative_base()
