from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.core.roles import UserRole

class Liga(Base):
    __tablename__ = "ligas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    temporada_id = Column(Integer, ForeignKey("temporadas.id"), nullable=True, index=True)

    codigo_convite = Column(String, nullable=False)

    id_dono = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)

    data_criacao = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    #Relacionamentos

    dono = relationship("Usuario", back_populates="ligas_criadas")
    membros = relationship("LigaMembro", back_populates="liga", cascade="all, delete-orphan")
    palpites = relationship("Palpite", back_populates="liga", cascade="all, delete-orphan")
    temporada = relationship("Temporada")

    __table_args__ = (
        UniqueConstraint("id_dono", "temporada_id", "nome", name="uq_liga_dono_temporada_nome"),
        UniqueConstraint("codigo_convite", name="uq_liga_codigo_convite")
    )