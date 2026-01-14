import os
import json
import firebase_admin
from firebase_admin import credentials

_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if _firebase_app:
        return _firebase_app

    # 🔹 OPÇÃO 1 — JSON direto (produção / Render)
    json_env = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if json_env:
        cred_dict = json.loads(json_env)
        cred = credentials.Certificate(cred_dict)
        _firebase_app = firebase_admin.initialize_app(cred)
        return _firebase_app

    # 🔹 OPÇÃO 2 — PATH (local)
    path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not path:
        raise RuntimeError(
            "Defina FIREBASE_SERVICE_ACCOUNT_JSON (produção) "
            "ou FIREBASE_SERVICE_ACCOUNT_PATH (local)"
        )

    cred = credentials.Certificate(path)
    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app
