from fastapi import FastAPI
from app.database import engine, Base
from app.routes import usuario, auth, liga, liga_membro, liga_services, time
from app import models




app = FastAPI(title="Bolão do Brasileirão")



Base.metadata.create_all(bind = engine)

app.include_router(usuario.router)
app.include_router(auth.router)
app.include_router(liga.router)
app.include_router(liga_membro.router)
app.include_router(liga_services.router)
app.include_router(time.router)


@app.get("/")
def root():
    return {"message": "API do Bolão do Brasileirão está rodando!"}