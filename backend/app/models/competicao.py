from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base

class Competicao(Base):
    __tablename__ = "competicoes"

    id = Column(Integer, primary_key=True)
    nome = Column(String(80), nullable=False, unique=True)
    pais = Column(String(50), nullable=False)
    tipo = Column(String(20), nullable=False)


    temporadas = relationship("Temporada", back_populates="competicao", cascade="all, delete-orphan")
