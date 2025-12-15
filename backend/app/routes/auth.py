from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.auth import Token
from app.core.security import verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/login", response_model=Token)

def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    usuario = (db.query(Usuario).filter(Usuario.email_login == form_data.username).first())

    if not usuario or not verify_password(form_data.password, usuario.senha):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login ou senha incorretos")
    
    token =  create_access_token(
        data={"sub": str(usuario.id)}
    )

    return {"access_token": token, "token_type": "bearer"}