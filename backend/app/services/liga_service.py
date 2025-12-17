from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.liga import Liga
from app.models.liga_membro import LigaMembro
from app.core.liga_roles import LigaRole


def transferir_posse_liga(
        db: Session,
        liga_id: int,
        dono_atual_id: int,
        novo_dono_id: int
):
    if dono_atual_id == novo_dono_id:
        raise HTTPException(status_code=400, detail="O novo dono deve ser diferente do dono atual.")
    
    liga = db.query(Liga).filter(Liga.id == liga_id).first()

    if not liga:
        raise HTTPException(status_code=404, detail="Liga não foi encontrada.")
    
    if liga.id_dono != dono_atual_id:
        raise HTTPException(status_code=403, detail="Apenas o dono atual pode transferir posse.")
    
    membro_dono_atual = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == dono_atual_id).first()

    if not membro_dono_atual or membro_dono_atual.papel != LigaRole.dono:
        raise HTTPException(status_code=409, detail="Estado Inconsistente: dono não está marcado como dono da liga.")
    
    membro_novo_dono = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == novo_dono_id).first()

    if not membro_novo_dono:
        raise HTTPException(status_code=404, detail="O novo dono precisa ser membro da liga.")
    
    try:
        membro_dono_atual.papel = LigaRole.membro
        membro_novo_dono.papel = LigaRole.dono
        liga.id_dono = novo_dono_id

        db.commit()
    except Exception:
        db.rollback()
        raise 
