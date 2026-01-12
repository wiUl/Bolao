from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import usuario, auth, liga, liga_membro, liga_services, time, competicao, temporada, jogo, palpite, pagamentos
from app import models




app = FastAPI(title=" API FutBolão")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(usuario.router)
app.include_router(auth.router)
app.include_router(liga.router)
app.include_router(liga_membro.router)
app.include_router(liga_services.router)
app.include_router(time.router)
app.include_router(competicao.router)
app.include_router(temporada.router)
app.include_router(jogo.router)
app.include_router(palpite.router)
app.include_router(pagamentos.router)


@app.get("/")
def root():
    return {"message": "API do Bolão do Brasileirão está rodando!"}