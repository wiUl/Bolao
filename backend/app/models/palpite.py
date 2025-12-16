from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Palpite(Base):
    __tablename__ = "palpites"

    id = Column(Integer, primary_key=True, index=True)

    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    jogo_id = Column(Integer, ForeignKey("jogos.id", ondelete="CASCADE"), nullable=False, index=True)

    placar_casa = Column(Integer, nullable=False)
    placar_fora = Column(Integer, nullable=False)

    # Calculado quando o jogo terminar
    pontos = Column(Integer, nullable=True, index=True)

    data_criacao = Column(DateTime, default=datetime.utcnow, nullable=False)
    ultima_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    liga = relationship("Liga", back_populates="palpites")
    usuario = relationship("Usuario", back_populates="palpites")
    jogo = relationship("Jogo", back_populates="palpites")

    __table_args__ = (
        UniqueConstraint("liga_id", "usuario_id", "jogo_id", name="uq_palpite_liga_usuario_jogo"),
    )
