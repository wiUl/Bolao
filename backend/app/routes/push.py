import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from firebase_admin._messaging_utils import UnregisteredError


from app.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.push import PushTokenIn, PushOk, DiagnosticoPayload
from app.models.push_token import PushToken
from app.services.push_sender import send_to_token
from app.services.push_scheduler import run_missing_bet_alerts

router = APIRouter(prefix="/push", tags=["Push"])
logger = logging.getLogger(__name__)

@router.post("/register-token", response_model=PushOk)
def register_token(payload: PushTokenIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    logger.info("register-token | user_id=%s platform=%s token_prefix=%s", user.id, payload.platform, payload.token[:20])
    # upsert simples por token
    existing = db.query(PushToken).filter(PushToken.token == payload.token).first()
    if existing:
        existing.user_id = user.id
        existing.platform = payload.platform
        existing.is_active = True
        logger.info("Token atualizado | push_token_id=%s user_id=%s", existing.id, user.id)
    else:
        db.add(PushToken(user_id=user.id, token=payload.token, platform=payload.platform, is_active=True))
        logger.info("Novo token registrado | user_id=%s", user.id)
    db.commit()
    return {"ok": True}

@router.post("/unregister-token", response_model=PushOk)
def unregister_token(payload: PushTokenIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    logger.info("unregister-token | user_id=%s token_prefix=%s", user.id, payload.token[:20])
    token = db.query(PushToken).filter(PushToken.token == payload.token, PushToken.user_id == user.id).first()
    if token:
        token.is_active = False
        db.commit()
        logger.info("Token desativado | push_token_id=%s", token.id)
    else:
        logger.warning("unregister-token: token nao encontrado para user_id=%s", user.id)
    return {"ok": True}

@router.post("/diagnostico", response_model=PushOk)
def diagnostico_push(payload: DiagnosticoPayload, user=Depends(get_current_user)):
    logger.error(
        "PUSH_DIAGNOSTICO | user_id=%s etapa=%s erro=%r contexto=%s",
        user.id, payload.etapa, payload.erro, payload.contexto,
    )
    return {"ok": True}


@router.post("/envia_alertas")
def envia_alertas(db: Session = Depends(get_db), x_cron_secret: str | None = Header(default=None)):
    expected = os.getenv("PUSH_CRON_SECRET")
    if not expected:
        raise HTTPException(status_code=500, detail="PUSH_CRON_SECRET não configurado no servidor.")
    if x_cron_secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        result = run_missing_bet_alerts(db)
        return {"ok": True, "result": result}
    except OperationalError as e:
        # Timeout / rede / pooler fora
        raise HTTPException(status_code=503, detail="DB indisponível (timeout/conexão). Tente novamente.") from e

@router.post("/test", response_model=PushOk)
def test_push(db: Session = Depends(get_db), user=Depends(get_current_user)):
    tokens = (
        db.query(PushToken)
        .filter(PushToken.user_id == user.id, PushToken.is_active == True)  # noqa
        .all()
    )

    if not tokens:
        return {"ok": False, "reason": "no_active_tokens", "count": 0}

    sent = 0
    disabled = 0
    errors = []

    for t in tokens:
        try:
            send_to_token(
                t.token,
                "Teste Bolão",
                "Se você recebeu isso, funcionou ✅",
                {"kind": "test"},
            )
            sent += 1

        except UnregisteredError:
            # token não existe mais → desativa
            t.is_active = False
            disabled += 1

        except Exception as e:
            # erro real (credencial, rede, etc)
            errors.append(str(e))

    db.commit()

    return {
        "ok": True,
        "tokens": len(tokens),
        "sent": sent,
        "disabled": disabled,
        "errors": errors,
    }

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