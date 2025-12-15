from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate

def criar_usuario(db: Session, usuario: UsuarioCreate):
   try:
        novo_usuario = Usuario(
            nome = usuario.nome,
            email_login = usuario.email_login,
            senha = usuario.senha
            )
        db.add(novo_usuario)
        db.commit()
        db.refresh(novo_usuario)

        return novo_usuario
   
   except:
       db.rollback()
       raise 
   

def listar_usuarios(db: Session):
    return db.query(Usuario).all()

def buscar_usuario_por_id(db: Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()

def atualizar_usuario(db: Session, usuario_id: int, dados):
    usuario = buscar_usuario_por_id(db, usuario_id)
    if not usuario:
        return None
    
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)

    return usuario

def deletar_usuario(db: Session, usuario_id: int):
    usuario = buscar_usuario_por_id(db, usuario_id)
    if not usuario:
        return None
    
    db.delete(usuario)
    db.commit()

    return True