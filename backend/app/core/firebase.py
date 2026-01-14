import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials

_firebase_app = None

def get_firebase_app():
    global _firebase_app
    if _firebase_app:
        return _firebase_app

    print("FIREBASE_SERVICE_ACCOUNT_PATH =", os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"))
    path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    print("PATH:", path, "exists?", Path(path).exists())
    if not path:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_PATH não definido")

    cred = credentials.Certificate(path)
    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app
