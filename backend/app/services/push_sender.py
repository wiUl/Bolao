from firebase_admin import messaging
from app.core.firebase import get_firebase_app


def send_to_token(token: str, title: str, body: str, data: dict | None = None):
    get_firebase_app()  # garante init

    payload = {
        "title": title,
        "body": body,
        **{k: str(v) for k, v in (data or {}).items()},
    }

    msg = messaging.Message(
        data=payload,
        token=token,
    )

    return messaging.send(msg)
