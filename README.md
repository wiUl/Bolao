# 🏆 Projeto Bolão Brasileirão

Sistema **fullstack** de Bolão do Campeonato Brasileiro desenvolvido com foco em **regras de negócio reais**, **arquitetura organizada**, **consultas analíticas** e **padrões próximos aos utilizados em aplicações de mercado**.

Este projeto nasceu a partir de uma experiência prática: durante o Brasileirão de 2025, gerenciei manualmente um bolão entre amigos utilizando uma planilha no Google Spreadsheets. Ao longo do campeonato, surgiram desafios como controle de palpites, cálculo de pontuação, ranking por rodada e histórico de desempenho. Ao final, a ideia foi transformar esse processo manual em um **sistema completo**, automatizado e escalável, que também servisse como **projeto de portfólio** para demonstrar domínio em backend, modelagem de dados e arquitetura de software.

---

## 🎯 Objetivo do Projeto

O principal objetivo do sistema é permitir que usuários participem de **ligas privadas** para palpitar resultados dos jogos do Campeonato Brasileiro, oferecendo:

- Gestão completa de ligas e membros  
- Envio controlado de palpites por rodada e por jogo  
- Cálculo automático e confiável de pontuação  
- Rankings detalhados (geral e por rodada)  
- Histórico de desempenho individual e coletivo  

O sistema foi modelado para ser **flexível**, suportando campeonatos com diferentes quantidades de rodadas, além de permitir evolução futura das regras de pontuação e das consultas analíticas.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Python**  
- **FastAPI** – construção da API REST  
- **SQLAlchemy (ORM)** – modelagem e persistência dos dados  
- **Pydantic** – validação e serialização  
- **JWT (OAuth2 Password Flow)** – autenticação  
- **Passlib + bcrypt** – segurança de senhas  

### Banco de Dados
- **SQLite** (ambiente de desenvolvimento)  
  > O projeto já está preparado para migração futura para PostgreSQL.

### Frontend
- **Next.js (App Router)**  
- **React**  
- **TypeScript**  

---

## 🧱 Arquitetura do Projeto

O projeto segue uma **arquitetura em camadas**, separando claramente responsabilidades:

- **Models**  
  Definem as entidades do domínio e seus relacionamentos (usuário, liga, temporada, jogo, palpite, etc.).

- **Schemas**  
  Utilizados para validação de dados de entrada e saída da API, garantindo contratos claros entre backend e frontend.

- **CRUD**  
  Responsável por operações básicas no banco de dados.

- **Services**  
  Camada central de regras de negócio, onde ficam:
  - Cálculo de pontuação
  - Rankings
  - Consultas analíticas
  - Validações de domínio

- **Routes (Endpoints)**  
  Camada de exposição da API REST, mantendo os endpoints simples e delegando lógica para os services.

Essa organização reduz acoplamento, melhora testabilidade e facilita a evolução do sistema.

---

## 🗂️ Estrutura de Pastas

```
Bolao/
├── backend/
│   ├── app/
│   │   ├── models/        # Entidades e relacionamentos (SQLAlchemy)
│   │   ├── schemas/       # Schemas Pydantic
│   │   ├── crud/          # Operações básicas de banco
│   │   ├── services/      # Regras de negócio e consultas complexas
│   │   ├── routes/        # Endpoints FastAPI
│   │   └── core/          # Autenticação, permissões e utilitários
│   ├── migrations/        # Versionamento de banco (Alembic)
│   ├── scripts/           # Scripts auxiliares e carga de dados
│   └── tests/             # Testes automatizados
│
└── frontend/
    ├── src/app/           # App Router (Next.js)
    ├── api/               # Clients para consumo da API
    └── auth/              # Contexto de autenticação
```

---

## ⚙️ Funcionalidades Implementadas

### 👤 Usuários e Autenticação
- Cadastro e login de usuários  
- Autenticação baseada em JWT  
- Armazenamento seguro de senhas com hash  

### 🏟️ Ligas
- Criação de ligas associadas a temporadas  
- Entrada em ligas por código de convite  
- Controle de membros  
- Sistema de papéis:
  - **Dono da liga**
  - **Administrador**
  - **Membro**
- Alteração de papéis e remoção de membros  

### 📅 Temporadas, Rodadas e Jogos
- Cadastro de competições e temporadas  
- Suporte a campeonatos com número variável de rodadas  
- Associação de jogos às rodadas  
- Atualização de resultados dos jogos  

### ✍️ Palpites
- Envio de palpites por jogo  
- Remoção e atualização de palpites  
- Validação de pertencimento à liga  
- Bloqueio de palpites após início do jogo  

### 🧮 Regras de Pontuação
- **5 pontos**: placar exato  
- **4 pontos**: acerto do vencedor + diferença de gols  
- **3 pontos**: acerto do vencedor ou empate  
- **0 pontos**: erro  

### 🏆 Rankings e Estatísticas
- Ranking geral da liga  
- Ranking por rodada  
- Pontuação total por rodada  
- Quantidade de acertos por tipo  

### 📈 Consultas Analíticas
- Pontuação acumulada por rodada  
- Evolução histórica de desempenho do usuário  
- Pontuação acumulada de todos os usuários da liga  
- Listagem de palpites por rodada  

Essas consultas viabilizam dashboards, gráficos comparativos e análises de desempenho no frontend.

---

## 🔄 Fluxo Geral do Sistema

1. Usuário cria conta e se autentica  
2. Usuário cria ou entra em uma liga via convite  
3. Liga é associada a uma temporada  
4. Temporada contém rodadas  
5. Rodadas contêm jogos  
6. Usuários enviam palpites  
7. Jogos são finalizados  
8. Pontuação é calculada automaticamente  
9. Rankings e estatísticas são disponibilizados  

---

## 📦 Estado Atual do Projeto

O projeto conta atualmente com:

- Backend completo e funcional  
- Modelagem de domínio consolidada  
- Regras de negócio bem definidas  
- Consultas analíticas prontas  

### Próximos Passos Planejados
- Dashboards e gráficos no frontend  
- Migração para PostgreSQL  
- Deploy em ambiente de produção  
- Testes automatizados mais abrangentes  

---

## 🚀 Como Executar o Projeto

```bash
# criar ambiente virtual
python -m venv venv

# ativar ambiente virtual
# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

# instalar dependências
pip install -r requirements.txt

# rodar aplicação
uvicorn app.main:app --reload
```

A API ficará disponível em:
```
http://127.0.0.1:8000
```

Documentação automática:
```
http://127.0.0.1:8000/docs
```

---

## 📌 Considerações Finais

Este projeto vai além de um CRUD simples, explorando regras de negócio reais, consultas analíticas e organização arquitetural. Ele foi desenvolvido com foco em aprendizado profundo de **FastAPI**, **SQLAlchemy** e **arquitetura backend**, servindo como base para um produto real e como **projeto de portfólio**.

---

Desenvolvido por **Willian Gomes**
