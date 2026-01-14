import os
from sqlalchemy.orm import Session


from app.database import Sessionlocal 
from app import models 
from app.models.competicao import Competicao
from app.models.usuario import Usuario
from app.models.temporada import Temporada
from app.models.time import Time
from app.core.security import get_password_hash


TIMES_BRASILEIRAO_2025 = [
    ("Atlético Mineiro", "CAM"),
    ("Bahia", "BAH"),
    ("Botafogo", "BOT"),
    ("Ceará", "CEA"),
    ("Corinthians", "COR"),
    ("Cruzeiro", "CRU"),
    ("Flamengo", "FLA"),
    ("Fluminense", "FLU"),
    ("Fortaleza", "FOR"),
    ("Grêmio", "GRE"),
    ("Internacional", "INT"),
    ("Juventude", "JUV"),
    ("Mirassol", "MIR"),
    ("Palmeiras", "PAL"),
    ("RB Bragantino", "RBB"),
    ("Santos", "SAN"),
    ("São Paulo", "SAO"),
    ("Sport", "SPO"),
    ("Vasco da Gama", "VAS"),
    ("Vitória", "VIT"),
]

def seed_admin(db: Session) -> Usuario:
    login = os.getenv("ADMIN_LOGIN")
    senha = os.getenv("ADMIN_SENHA")

    if not login or not senha:
        raise RuntimeError("ADMIN_LOGIN e ADMIN_SENHA precisam estar definidos no .env")

    admin = db.query(Usuario).filter(Usuario.funcao == "admin").first()
    if admin:
        print("✅ Admin já existe.")
        return admin

    admin = Usuario(
        nome="Willian Raphael Rosa Gomes",
        email_login=login,
        senha=get_password_hash(senha),
        funcao="admin",
    )
    db.add(admin)
    db.flush()  # pega id sem commit
    print("✅ Admin criado.")
    return admin

def seed_usuarios(db: Session):
    i = 1
    criados = 0
    existentes = 0

    while True:
        nome = os.getenv(f"USER_{i}_NOME")
        email = os.getenv(f"USER_{i}_LOGIN")
        senha = os.getenv(f"USER_{i}_SENHA")

        # fim da lista
        if not nome and not email and not senha:
            break

        # usuário incompleto
        if not nome or not email or not senha:
            raise RuntimeError(
                f"USER_{i}_* incompleto no .env. "
                f"NOME={bool(nome)} EMAIL={bool(email)} SENHA={bool(senha)}"
            )

        if db.query(Usuario).filter(Usuario.email_login == email).first():
            existentes += 1
            i += 1
            continue

        db.add(Usuario(
            nome=nome,
            email_login=email,
            senha=get_password_hash(senha),
            funcao="user",
        ))
        criados += 1
        i += 1

    db.commit()
    print(f"✅ Usuários seed: {criados} criados, {existentes} já existiam.")

def seed_competicao_temporada(db: Session):
    # Competição (ajuste nomes/colunas conforme seu model)
    comp = db.query(Competicao).filter(Competicao.nome == "Brasileirão Série A").first()
    if not comp:
        comp = Competicao(nome="Brasileirão Série A", pais="Brasil", tipo="liga")
        db.add(comp)
        db.flush()
        print("✅ Competição criada.")
    else:
        print("✅ Competição já existe.")

    # Temporada 2025 (unique: competicao_id + ano)
    temp = (
        db.query(Temporada)
        .filter(Temporada.competicao_id == comp.id, Temporada.ano == 2025)
        .first()
    )
    if not temp:
        temp = Temporada(competicao_id=comp.id, ano=2025, status="planejada")
        db.add(temp)
        db.flush()
        print("✅ Temporada 2025 criada.")
    else:
        print("✅ Temporada 2025 já existe.")

def seed_times(db: Session):
    criados = 0
    for nome, sigla in TIMES_BRASILEIRAO_2025:
        time = db.query(Time).filter(Time.nome == nome).first()
        if not time:
            db.add(Time(nome=nome, sigla=sigla))
            criados += 1
    print(f"✅ Times inseridos: {criados} (idempotente).")

def run_seed():
    db = Sessionlocal()
    try:
        seed_admin(db)
        seed_usuarios(db)
        seed_competicao_temporada(db)
        seed_times(db)
        db.commit()
        print("🎉 Seed finalizado com sucesso.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
