from fastapi import Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.usuario import Usuario
from app.models.liga_membro import LigaMembro
from sqlalchemy.orm import Session

from app.core.liga_roles import LigaRole
from app.database import get_db


def require_admin(
        usuario: Usuario = Depends(get_current_user)
):
    if usuario.funcao != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente"
        )
    
    return usuario

def get_papel_liga(db: Session, liga_id: int, usuario_id: int) -> str | None:
    membro = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == usuario_id).first()
    return membro.papel if membro else None

def require_liga_papel(db: Session, liga_id: int, usuario_id: int, roles: list[LigaRole]) -> LigaRole:
    papel = get_papel_liga(db, liga_id, usuario_id)

    if papel is None:
        raise HTTPException(status_code=403, detail="Você não é membro desta liga.")
    
    try:
        papel_enum = LigaRole(papel) if isinstance(papel, str) else papel
    except ValueError:
        raise HTTPException(status_code=500, detail="Papel inválido salvo no banco.")

    if papel_enum not in roles:
        raise HTTPException(status_code=403, detail="Você não tem permissão para essa ação.")

    return papel_enum 

def require_liga_roles(roles: list[LigaRole]):
    def checker(
        liga_id: int,  # vem do path automaticamente
        db: Session = Depends(get_db),
        usuario_logado: Usuario = Depends(get_current_user),
    ) -> LigaRole:
        return require_liga_papel(db, liga_id, usuario_logado.id, roles)

    return checker