from fastapi import FastAPI
from app.database import engine, Base
from app.routes import usuario, auth, liga
from app import models


app = FastAPI(title="Bolão do Brasileirão")


print(Base.metadata.tables.keys())
Base.metadata.create_all(bind = engine)

app.include_router(usuario.router)
app.include_router(auth.router)
app.include_router(liga.router)

@app.get("/")
def root():
    return {"message": "API do Bolão do Brasileirão está rodando!"}