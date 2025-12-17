from sqlalchemy.orm import Session
from app.models.liga_membro import LigaMembro
from app.core.liga_roles import LigaRole
from app.models.usuario import Usuario

def atualizar_papel_membro(
        db: Session,
        liga_id: int,
        usuario_id: int,
        novo_papel: LigaRole
) -> LigaMembro | None:
    
    membro = db.query(LigaMembro).filter(
        LigaMembro.liga_id == liga_id,
        LigaMembro.usuario_id == usuario_id
    ).first()

    if not membro:
        return None
    
    membro.papel = novo_papel
    db.commit()
    db.refresh(membro)

    return membro

def listar_membros_liga(db: Session, liga_id: int):
    return(
        db.query(
            LigaMembro.id,
            LigaMembro.liga_id,
            LigaMembro.usuario_id,
            Usuario.nome.label("nome"),
            LigaMembro.papel,
            LigaMembro.data_ingresso,
        ).join(Usuario, Usuario.id == LigaMembro.usuario_id)
        .filter(LigaMembro.liga_id == liga_id)
        .order_by(LigaMembro.papel.asc(), Usuario.nome.asc())
    ).all()

def remover_membro_liga(db: Session, liga_id: int, usuario_id: int) -> bool:
    membro = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == usuario_id).first()

    if not membro:
        return False
    
    db.delete(membro)
    db.commit()

    return True



