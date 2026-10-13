# 🏆 FutBolão

Sistema **fullstack** de bolão do Campeonato Brasileiro, com ligas privadas, palpites por jogo, pontuação automática, rankings, controle de cobrança e notificações push. API em **FastAPI** e interface em **Next.js**.

O projeto nasceu de uma experiência prática: durante o Brasileirão de 2025, gerenciei manualmente um bolão entre amigos em uma planilha do Google. Ao longo do campeonato surgiram problemas de controle de palpites, cálculo de pontuação, ranking por rodada e histórico de desempenho. O FutBolão transforma esse processo manual em um sistema automatizado, com regras de negócio reais e consultas analíticas sobre o desempenho dos participantes.

- **Frontend publicado:** https://wiuls-projects-futbolao.vercel.app
- **Estado:** em desenvolvimento ativo (último commit em 29/08/2026).

---

## Funcionalidades implementadas

**Usuários e autenticação**
- Cadastro e login com JWT; senhas armazenadas com hash (passlib + bcrypt).
- Expiração de sessão no frontend (logout automático quando o token expira).

**Ligas**
- Criação de ligas associadas a uma temporada e entrada por código de convite.
- Papéis: dono, administrador e membro; alteração de papéis e remoção de membros.
- Filtro de ligas ativas e encerradas.

**Competições, temporadas, rodadas e jogos**
- Cadastro de competições, temporadas, times e jogos, com número variável de rodadas.
- Atualização de resultados e horários com fuso horário.
- Scripts de importação de jogos do Brasileirão 2025 e 2026 e da Copa do Mundo 2026 (`backend/scripts/`).

**Palpites e pontuação**
- Envio, atualização e remoção de palpites por jogo, com validação de participação na liga.
- Bloqueio de palpites após o início do jogo.
- Regras de pontuação (implementadas em `backend/app/services/palpites.py`):

| Pontos | Critério |
| :---: | --- |
| 5 | Placar exato |
| 4 | Acertou o vencedor e a diferença de gols |
| 3 | Acertou o vencedor ou o empate |
| 0 | Erro |

**Rankings e análises**
- Ranking geral e por rodada, pontuação acumulada e evolução histórica por usuário.
- Página de gráficos por liga no frontend.

**Cobrança e pagamentos**
- Controle mensal de cobrança por liga e registro de pagamentos por usuário.

**Notificações push**
- Registro de tokens de dispositivo (Firebase Cloud Messaging) e worker que envia alertas de palpites pendentes.

**Painel administrativo**
- Telas de administração de competições, temporadas, times, jogos e usuários.

---

## Arquitetura

```text
Bolao/
├── backend/
│   ├── app/
│   │   ├── core/        # autenticação, permissões e utilitários
│   │   ├── models/      # entidades SQLAlchemy
│   │   ├── schemas/     # validação e serialização (Pydantic)
│   │   ├── crud/        # operações básicas de banco
│   │   ├── services/    # regras de negócio, rankings e push
│   │   ├── routes/      # endpoints FastAPI
│   │   └── workers/     # worker de alertas push
│   ├── migrations/      # migrações Alembic
│   └── scripts/         # importação de jogos e palpites, migração SQLite → PostgreSQL
└── frontend/
    └── src/app/         # Next.js (App Router): área pública, área do usuário e administração
```

O backend segue uma arquitetura em camadas: as rotas expõem a API e delegam as regras de negócio aos serviços; os modelos e schemas separam persistência e contrato de dados.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Backend | Python, FastAPI, SQLAlchemy 2, Alembic, Pydantic, PyJWT, passlib/bcrypt, firebase-admin, pandas |
| Banco de dados | SQLite (padrão no repositório) e PostgreSQL (driver `psycopg` e script de migração incluídos) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Infraestrutura | Frontend na Vercel |

---

## Como executar

### Pré-requisitos
- Python 3 e Node.js.

### 1. Variáveis de ambiente
O backend carrega um arquivo `.env` na **raiz do repositório**. As variáveis usadas no código são:

| Variável | Uso |
| --- | --- |
| `SECRET_KEY` | **Obrigatória.** Chave de assinatura do JWT (a API não inicia sem ela). |
| `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | Configuração do token JWT. |
| `DATABASE_URL` | Banco de dados. Padrão: `sqlite:///./bolao.db`. |
| `ADMIN_LOGIN`, `ADMIN_SENHA` | Credenciais do administrador criado pelos scripts de seed. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` ou `FIREBASE_SERVICE_ACCOUNT_PATH` | Credencial do Firebase para as notificações push. |
| `PUSH_CRON_SECRET` | Segredo do endpoint de envio de alertas. |
| `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`, `DB_POOL_RECYCLE`, `USE_NULL_POOL` | Ajustes opcionais do pool de conexões. |

No frontend, `NEXT_PUBLIC_API_URL` define o endereço da API e as variáveis `NEXT_PUBLIC_FIREBASE_*` configuram o push.

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Documentação interativa (Swagger): http://127.0.0.1:8000/docs
- Migrações: ficam em `backend/migrations` (Alembic).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Interface em http://localhost:3000.

### 4. Worker de notificações (opcional)

```bash
cd backend
python -m app.workers.push_worker
```

---

## Limitações e próximos passos

- **Testes automatizados:** ainda não há testes no repositório.
- **Dashboards:** a análise de desempenho já tem página de gráficos; novas visualizações estão previstas.
- **Banco de produção:** migração completa para PostgreSQL e deploy do backend são próximos passos planejados.
- O repositório inclui bancos SQLite e arquivos CSV de palpites de participantes do bolão de 2025, usados na carga inicial dos dados.

---

Desenvolvido por **Willian Gomes**.
