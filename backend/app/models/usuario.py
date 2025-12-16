from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.core.roles import UserRole

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email_login = Column(String, unique=True, index=True, nullable=False)
    senha = Column(String, nullable=False)
    funcao = Column(String, default=UserRole.USER.value, nullable=False)

    #Relacionamentos
    ligas_criadas = relationship("Liga", back_populates="dono")
    ligas_participando = relationship("LigaMembro", back_populates="usuario", cascade="all, delete-orphan")
    palpites = relationship("Palpite", back_populates="usuario", cascade="all, delete-orphan")
