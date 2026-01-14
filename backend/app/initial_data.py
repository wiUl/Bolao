import os
from sqlalchemy.orm import Session
from app.database import Sessionlocal
from app.models.usuario import Usuario
from app.core.security import get_password_hash


def criar_admin():
    db: Session = Sessionlocal()

    admin = db.query(Usuario).filter(Usuario.funcao == "admin").first()

    login = os.getenv("ADMIN_LOGIN")
    senha = os.getenv("ADMIN_SENHA")

    if admin:
        print("Admin já existe")
        return
    
    admin = Usuario(
        nome = "Willian Raphael Rosa Gomes",
        email_login = login,
        senha = get_password_hash(senha),
        funcao = "admin"
    )

    db.add(admin)
    db.commit()
    print("Admin criado com sucesso!")

if __name__ == "__main__":
    criar_admin()
