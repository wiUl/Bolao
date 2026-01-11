from datetime import datetime, timezone

from sqlalchemy import Column,Integer,Boolean,DateTime,ForeignKey,UniqueConstraint,CheckConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class LigaPagamento(Base):
    __tablename__ = "liga_pagamentos"

    id = Column(Integer, primary_key=True, index=True)

    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)

    mes = Column(Integer, nullable=False, index=True)  # 1..12
    pago = Column(Boolean, nullable=False, default=False)

    updated_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    updated_by = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    liga = relationship("Liga")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    atualizado_por = relationship("Usuario", foreign_keys=[updated_by])

    __table_args__ = (
        UniqueConstraint("liga_id", "usuario_id", "mes", name="uq_liga_pagamento"),
        CheckConstraint("mes >= 1 AND mes <= 12", name="ck_liga_pagamento_mes_range"),
    )
