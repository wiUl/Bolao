import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLALCHEMY_DATABASE_URL = "sqlite:///./bolao.db"

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bolao.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {"prepare_threshold": None}


engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future = True,
    pool_pre_ping= True,
)

Sessionlocal = sessionmaker(
    autocommit = False,
    autoflush = False,
    bind = engine
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