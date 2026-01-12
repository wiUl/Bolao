from pydantic import BaseModel

class PushTokenIn(BaseModel):
    token: str
    platform: str = "web"

class PushOk(BaseModel):
    ok: bool
