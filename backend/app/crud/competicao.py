from sqlalchemy.orm import Session
from app.models.competicao import Competicao
from app.schemas.competicao import CompeticaoCreate, CompeticaoUpdate

def criar_competicao(db: Session, body: CompeticaoCreate) -> Competicao:
    obj = Competicao(
        nome=body.nome.strip(),
        pais=body.pais.strip() if body.pais else None,
        tipo=body.tipo.strip() if body.tipo else None,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def listar_competicoes(db: Session) -> list[Competicao]:
    return db.query(Competicao).order_by(Competicao.nome.asc()).all()

def buscar_competicao(db: Session, competicao_id: int) -> Competicao | None:
    return db.query(Competicao).filter(Competicao.id == competicao_id).first()

def atualizar_competicao(db: Session, obj: Competicao, body: CompeticaoUpdate) -> Competicao:
    if body.nome is not None:
        obj.nome = body.nome.strip()
    if body.pais is not None:
        obj.pais = body.pais.strip() if body.pais else None
    if body.tipo is not None:
        obj.tipo = body.tipo.strip() if body.tipo else None

    db.commit()
    db.refresh(obj)
    return obj

def deletar_competicao(db: Session, obj: Competicao) -> None:
    db.delete(obj)
    db.commit()
