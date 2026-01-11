from datetime import datetime, timezone

from sqlalchemy import Column,Integer,Boolean,DateTime,ForeignKey,UniqueConstraint,CheckConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class LigaCobrancaMes(Base):
    __tablename__ = "liga_cobranca_meses"

    id = Column(Integer, primary_key=True, index=True)

    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)

    mes = Column(Integer, nullable=False, index=True)  # 1..12
    ativo = Column(Boolean, nullable=False, default=True)

    updated_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    liga = relationship("Liga")

    __table_args__ = (
        UniqueConstraint("liga_id", "mes", name="uq_liga_cobranca_mes"),
        CheckConstraint("mes >= 1 AND mes <= 12", name="ck_liga_cobranca_mes_range"),
    )
