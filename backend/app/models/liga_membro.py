from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class LigaMembro(Base):
    __tablename__ = "liga_membros"
    
    id = Column(Integer, primary_key=True, index=True)
    
    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)

    # papel dentro da liga: dono, admin_liga, membro
    papel = Column(String, nullable=False, default="membro", index=True)

    data_ingresso = Column(DateTime, default=datetime.utcnow, nullable=False)

    #Relacionamentos

    liga = relationship("Liga", back_populates="membros")
    usuario = relationship("Usuario", back_populates="ligas_participando")

    __table_args__ = (
        UniqueConstraint("liga_id", "usuario_id", name="uq_liga_membro_liga_usuario"),
    )