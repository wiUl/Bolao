from fastapi import Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.usuario import Usuario


def require_admin(
        usuario: Usuario = Depends(get_current_user)
):
    if usuario.funcao != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente"
        )
    
    return usuario