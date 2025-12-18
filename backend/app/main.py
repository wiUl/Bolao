from fastapi import FastAPI
from app.database import engine, Base
from app.routes import usuario, auth, liga, liga_membro, liga_services, time, competicao, temporada, jogo
from app import models




app = FastAPI(title="Bolão do Brasileirão")




app.include_router(usuario.router)
app.include_router(auth.router)
app.include_router(liga.router)
app.include_router(liga_membro.router)
app.include_router(liga_services.router)
app.include_router(time.router)
app.include_router(competicao.router)
app.include_router(temporada.router)
app.include_router(jogo.router)


@app.get("/")
def root():
    return {"message": "API do Bolão do Brasileirão está rodando!"}