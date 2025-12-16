from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base

class Jogo(Base):
    __tablename__ = "jogos"

    id = Column(Integer, primary_key=True, index=True)
    
    temporada = Column(Integer, nullable=False, index=True)
    rodada = Column(Integer, nullable=False, index=True)

    time_casa = Column(String, nullable=False, index=True)
    time_fora = Column(String, nullable=False, index=True)

    gols_casa = Column(Integer, nullable=True)
    gols_fora = Column(Integer, nullable=True)

    data_hora = Column(DateTime, nullable=True)

    # agendado / finalizado 
    status = Column(String, nullable=False, default="agendado", index=True)

    # Relacionamento
    palpites = relationship("Palpite", back_populates="jogo", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("temporada", "rodada", "time_casa", "time_fora", name="uq_jogo_temporada_rodada_times"),
    )