# ⚽ Bolão de Futebol 

Este projeto é sobre um sistema de bolão de futebol desenvolvido com foco em **boas práticas**, **clareza de domínio** e **escalabilidade**, utilizando FastAPI e SQLAlchemy.

O projeto permite a criação de ligas privadas, envio de palpites, cálculo automático de pontuação e geração de rankings por temporada.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Python**
- **FastAPI**
- **SQLAlchemy (ORM)**
- **Pydantic**
- **JWT (OAuth2 Password Flow)**
- **Passlib + bcrypt**

### Banco de Dados
- **SQLite** (ambiente de desenvolvimento)
- Preparado para **PostgreSQL / MySQL** em produção

### Infraestrutura
- **Alembic** para migrações
- **Seeds idempotentes** para dados iniciais

---

## ⚙️ Funcionalidades Implementadas

### 🔐 Autenticação e Usuários
- Autenticação com JWT
- Criação de admin via `.env`
- Seed de usuários comuns
- Hash seguro de senha
- Dependência `get_current_user`

### 🧩 Domínio do Sistema
- Competições e temporadas
- Times
- Jogos com rodadas, data/hora e resultado
- Ligas privadas por temporada
- Membros de liga com papéis (dono, admin, membro)
- Palpites por jogo

### 🧮 Pontuação
- Cálculo automático de pontos baseado no resultado real:
  - **5 pontos**: placar exato
  - **4 pontos**: acerto da diferença de gols e vencedor
  - **3 pontos**: acerto do vencedor ou empate
  - **0 pontos**: erro total

---

## 📊 Funcionalidades em Andamento

- Ranking por liga e temporada
- Pontuação por rodada
- Consulta de palpites por usuário
- Recalcular pontuação automaticamente ao atualizar resultado do jogo
- Endpoints otimizados para frontend

---

## 📍 Próximos Passos Planejados

- Endpoints de leitura (ranking, rodada, histórico)
- Ajustes finais de regras de negócio
- Preparação completa para PostgreSQL
- Frontend web (React / mobile)
- Deploy

---

## 📄 Status do Projeto

🚧 **Em desenvolvimento ativo**

Projeto pessoal com foco em aprendizado, boas práticas e escalável.

---

## ✍️ Autor

**Willian Gomes**  
Projeto pessoal para estudo e evolução em desenvolvimento backend.
