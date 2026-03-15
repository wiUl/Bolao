from pydantic import BaseModel

class PushTokenIn(BaseModel):
    token: str
    platform: str = "web"

class PushOk(BaseModel):
    ok: bool

class DiagnosticoPayload(BaseModel):
    etapa: str          # ex: "getToken", "registrarToken", "requestPermission"
    erro: str           # mensagem do erro capturada no catch
    contexto: dict = {} # info extra opcional
