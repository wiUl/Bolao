from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.push import PushTokenIn, PushOk
from app.models.push_token import PushToken
from app.services.push_sender import send_to_token

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