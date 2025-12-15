from fastapi import FastAPI

app = FastAPI(title="Bolão do Brasileirão")

@app.get("/")
def root():
    return {"message": "API do Bolão do Brasileirão está rodando!"}