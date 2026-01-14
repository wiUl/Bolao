import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.push import PushTokenIn, PushOk
from app.models.push_token import PushToken
from app.services.push_sender import send_to_token
from app.services.push_scheduler import run_missing_bet_alerts

router = APIRouter(prefix="/push", tags=["push"])

@router.post("/register-token", response_model=PushOk)
def register_token(payload: PushTokenIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # upsert simples por token
    existing = db.query(PushToken).filter(PushToken.token == payload.token).first()
    if existing:
        existing.user_id = user.id
        existing.platform = payload.platform
        existing.is_active = True
    else:
        db.add(PushToken(user_id=user.id, token=payload.token, platform=payload.platform, is_active=True))

    db.commit()
    return {"ok": True}

@router.post("/unregister-token", response_model=PushOk)
def unregister_token(payload: PushTokenIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    token = db.query(PushToken).filter(PushToken.token == payload.token, PushToken.user_id == user.id).first()
    if token:
        token.is_active = False
        db.commit()
    return {"ok": True}

@router.post("/envia_alertas")
def envia_alertas(db: Session = Depends(get_db), x_cron_secret: str | None = Header(default=None)):
    expected = os.getenv("PUSH_CRON_SECRET")

    if not expected:
        raise HTTPException(status_code=500, detail="PUSH_CRON_SECRET não configurado no servidor.")
    
    if x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    result = run_missing_bet_alerts(db)
    return {"ok": True, "result": result}

@router.post("/test", response_model=PushOk)
def test_push(db: Session = Depends(get_db), user=Depends(get_current_user)):
    tokens = (
        db.query(PushToken)
        .filter(PushToken.user_id == user.id, PushToken.is_active == True)  # noqa
        .all()
    )
    for t in tokens:
        send_to_token(t.token, "Teste Bolão", "Se você recebeu isso, funcionou ✅", {"kind": "test"})
    return {"ok": True}

@router.post("/logs/cleanup")
def cleanup_push_logs(days: int = 30, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # se você tiver role/admin, valide aqui
    # ex: if user.role not in ("admin", "owner"): raise HTTPException(403, ...)

    stmt = text("""
        DELETE FROM push_alerts_log
        WHERE created_at < NOW() - (CAST(:days AS TEXT) || ' days')::interval
    """)
    result = db.execute(stmt, {"days": days})
    db.commit()
    return {"ok": True, "deleted": result.rowcount, "days": days}