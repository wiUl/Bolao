from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Column, Integer, DateTime, ForeignKey, UniqueConstraint
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

    data_criacao = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ultima_atualizacao = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relacionamentos
    liga = relationship("Liga", back_populates="palpites")
    usuario = relationship("Usuario", back_populates="palpites")
    jogo = relationship("Jogo", back_populates="palpites")

    __table_args__ = (
        UniqueConstraint("liga_id", "usuario_id", "jogo_id", name="uq_palpite_liga_usuario_jogo"),
        CheckConstraint("placar_casa >= 0", name="ck_palpite_placar_casa_nao_negativo"),
        CheckConstraint("placar_fora >= 0", name="ck_palpite_placar_fora_nao_negativo"),
    )
