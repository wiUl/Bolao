from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.liga import Liga
from app.models.liga_membro import LigaMembro
from app.core.utils import gerar_codigo_convite
import logging

from app.schemas.liga import LigaUpdate

logger = logging.getLogger(__name__)

def criar_liga(db: Session, id_dono: int, nome: str, temporada: int) -> Liga:

    ja_existe = (
        db.query(Liga)
        .filter(Liga.id_dono == id_dono, Liga.nome == nome, Liga.temporada == temporada)
        .first()
    )
    if ja_existe:
        raise ValueError("Você já tem uma liga com esse nome nessa temporada.")

    for _ in range(10):
        codigo = gerar_codigo_convite(8)
        liga = Liga(
            nome=nome,
            temporada=temporada,
            codigo_convite = codigo,
            id_dono=id_dono
        )
        db.add(liga)
        try:
            db.commit()
            db.refresh(liga)
            break
        except IntegrityError as e:
            db.rollback()
            msg = str(e.orig)
            if "ligas.codigo_convite" in msg:
                liga = None
                continue
            raise
    
    if liga is None:
        raise ValueError("Não foi possível gerar um código de convite único.")
    
    #cria o membro dono
    membro = LigaMembro(liga_id=liga.id, usuario_id=id_dono, papel = "dono")
    db.add(membro)
    db.commit()
    return liga

def entrar_liga(db: Session, usuario_id: int, codigo_convite: str) -> Liga:
    liga = db.query(Liga).filter(Liga.codigo_convite == codigo_convite).first()
    if not liga:
        return None, "convite_invalido"
    
    #ja é membro?
    ja_membro = db.query(LigaMembro).filter(
        LigaMembro.liga_id == liga.id,
        LigaMembro.usuario_id == usuario_id
    ).first()

    if ja_membro:
        return liga, "ja_membro"
    
    membro = LigaMembro(liga_id=liga.id, usuario_id=usuario_id, papel="membro")
    db.add(membro)
    db.commit()

    return liga, "entrou"

def listar_ligas_do_usuario(db: Session, usuario_id: int, temporada: int | None = None):
    lista_ligas = db.query(Liga).join(LigaMembro, LigaMembro.liga_id == Liga.id).filter(LigaMembro.usuario_id == usuario_id)

    if temporada is not None:
        lista_ligas = lista_ligas.filter(Liga.temporada == temporada)

    return lista_ligas.order_by(Liga.data_criacao.desc()).all()

def buscar_liga_por_id(db: Session, liga_id:int) -> Liga | None:
    return db.query(Liga).filter(Liga.id == liga_id).first()

def atualizar_liga(db: Session, liga: Liga, dados: LigaUpdate) -> Liga:
    if dados.nome is not None:
        liga.nome = dados.nome

    db.commit()
    db.refresh(liga)
    return liga

def deletar_liga(db: Session, liga: Liga) -> None:
    db.delete(liga)
    db.commit()
