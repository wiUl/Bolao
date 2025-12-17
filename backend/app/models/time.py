from sqlalchemy import Column, Integer, String
from app.database import Base

class Time(Base):
    __tablename__ = "times"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(80), nullable=False, unique=True, index = True)
    sigla = Column(String(10), nullable=True, unique=True, index=True)
    escudo_url = Column(String(255), nullable=True)