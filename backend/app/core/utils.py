import secrets

def gerar_codigo_convite(tamanho: int = 8) -> str:
    return secrets.token_urlsafe(tamanho)[:tamanho]