from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from datetime import datetime
from app.database import Base
from sqlalchemy.orm import relationship


class Temporada(Base):
    __tablename__ = "temporadas"

    id = Column(Integer, primary_key=True)
    competicao_id = Column(Integer, ForeignKey("competicoes.id"), nullable=False)

    ano = Column(Integer, nullable=False)

    data_inicio = Column(DateTime(timezone=True), nullable=True)
    data_fim = Column(DateTime(timezone=True), nullable=True)

    status = Column(String(20), nullable=False, default="planejada")

    __table_args__ = (
        UniqueConstraint("competicao_id", "ano", name="uq_temporada_competicao_ano"),
    )

    competicao = relationship("Competicao", back_populates="temporadas")