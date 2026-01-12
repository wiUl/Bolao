from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class PushAlertLog(Base):
    __tablename__ = "push_alerts_log"

    id = Column(Integer, primary_key=True)
    jogo_id = Column(Integer, nullable=False, index=True)
    liga_id = Column(Integer, nullable=False, index=True)
    alert_type = Column(String, nullable=False)  # ex: "PRE_30"
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("jogo_id", "liga_id", "alert_type", name="uq_push_alert_jogo_liga_tipo"),
    )
