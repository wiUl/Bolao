from datetime import datetime
from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base

class Jogo(Base):
    __tablename__ = "jogos"

    id = Column(Integer, primary_key=True, index=True)
    
    temporada_id = Column(Integer, ForeignKey("temporadas.id"), nullable=False, index=True)
    rodada = Column(Integer, nullable=False, index=True)

    time_casa_id = Column(Integer, ForeignKey("times.id"), nullable=False, index=True)
    time_fora_id = Column(Integer, ForeignKey("times.id"), nullable=False, index=True)

    gols_casa = Column(Integer, nullable=True)
    gols_fora = Column(Integer, nullable=True)

    data_hora = Column(DateTime, nullable=True)

    # agendado / finalizado 
    status = Column(String, nullable=False, default="agendado", index=True)

    # Relacionamento
    palpites = relationship("Palpite", back_populates="jogo", cascade="all, delete-orphan")
    temporada = relationship("Temporada")
    time_casa = relationship("Time", foreign_keys=[time_casa_id])
    time_fora = relationship("Time", foreign_keys=[time_fora_id])

    __table_args__ = (
        UniqueConstraint("temporada_id", "rodada", "time_casa_id", "time_fora_id", name="uq_jogo_temporada_rodada_times"),
        CheckConstraint("time_casa_id != time_fora_id", name= "ck_jogo_times_diferentes")
    )