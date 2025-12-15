from fastapi import FastAPI
from app.database import engine, Base
from app.models import usuario

app = FastAPI(title="Bolão do Brasileirão")

Base.metadata.create_all(bind = engine)

@app.get("/")
def root():
    return {"message": "API do Bolão do Brasileirão está rodando!"}