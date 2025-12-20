# 🏆 Projeto Bolão Brasileirão

Backend de um sistema de **Bolão do Campeonato Brasileiro**, desenvolvido com foco em regras de negócio claras, organização em camadas e padrões próximos aos utilizados em aplicações de mercado. O projeto foi pensado tanto como **produto funcional** quanto como **peça de portfólio**, demonstrando modelagem de domínio, SQLAlchemy, FastAPI e boas práticas de backend. A ideia surgiu de um bolão que eu geri com meu grupo de amigos em 2025 do campeonato brasileiro, controlei todos os dados manualmente através de uma planilha no Google Spreadsheets que está disponível [aqui](https://docs.google.com/spreadsheets/d/1N4oWhcUq2zaDHTtEgslIRE229h59WKnImzfjltVu7K4/edit?usp=sharing). Ao fim do campeonato brasileiro me surgiu a ideia de juntar o útil ao agradável e tentar implementar um sistema de bolão simples que servisse de portfólio e ao mesmo tempo fosse um produto para ser utilizado com meus amigos em forma de descontração que dá forma através desse projeto. 

---

## 🎯 Objetivo do Projeto

Permitir que usuários participem de ligas privadas para palpitar resultados dos jogos do Brasileirão, com cálculo automático de pontuação, rankings detalhados e histórico de desempenho ao longo das rodadas.

O sistema foi modelado para ser **flexível**, permitindo temporadas com diferentes quantidades de rodadas e regras de pontuação extensíveis.

---

## 🛠️ Tecnologias Utilizadas

### Backend

* **Python**
* **FastAPI**
* **SQLAlchemy (ORM)**
* **Pydantic**
* **JWT (OAuth2 Password Flow)**
* **Passlib + bcrypt**

### Banco de Dados

* **SQLite** (ambiente de desenvolvimento)

---

## 🧱 Arquitetura do Projeto

O projeto segue uma separação clara de responsabilidades:

* **Models**: definição das entidades e relacionamentos (SQLAlchemy)
* **Schemas**: validação e serialização de dados (Pydantic)
* **CRUD / Services**: regras de negócio e operações no banco
* **Endpoints (Routes)**: exposição da API REST

Essa abordagem evita lógica complexa nos endpoints e facilita manutenção, testes e evolução do sistema.

---
## 🗂️ Organização do Projeto

A estrutura de pastas foi pensada para manter uma **separação clara de responsabilidades**, facilitando manutenção, leitura do código e evolução do sistema.

- **backend/**  
  Contém toda a implementação do servidor e das regras de negócio do sistema. É onde está concentrado o desenvolvimento atual do projeto.

  - **app/**  
    Núcleo da aplicação backend. Reúne toda a lógica principal.

    - **models/**  
      Define as entidades do domínio e seus relacionamentos utilizando SQLAlchemy.

    - **schemas/**  
      Contém os modelos Pydantic responsáveis pela validação, entrada e saída de dados da API.

    - **crud/**  
      Operações básicas de persistência no banco de dados (create, read, update, delete).

    - **services/**  
      Camada de regras de negócio e consultas mais complexas, como cálculo de pontuação, rankings e estatísticas.

    - **routes/**  
      Definição dos endpoints da aplicação (FastAPI), organizados por contexto.

    - **core/**  
      Configurações centrais da aplicação, como autenticação, segurança, variáveis de ambiente e utilitários.

  - **migrations/**  
    Estrutura destinada ao versionamento do banco de dados (Alembic).

  - **tests/**  
    Testes automatizados da aplicação.
    
  - **scripts/**  
  Scripts auxiliares utilizados para tarefas específicas, como carga inicial de dados, manutenção do banco, ajustes pontuais ou experimentações durante o desenvolvimento.

- **frontend/**  
  Pasta reservada para a futura implementação do frontend da aplicação.  
  Será responsável pela interface do usuário, consumo da API e visualização de rankings, gráficos e estatísticas.

Essa organização segue padrões comuns de projetos fullstack, permitindo evolução independente entre backend e frontend.

---

## ⚙️ Funcionalidades Implementadas

### 👤 Usuários e Autenticação

* Cadastro e login de usuários
* Autenticação via JWT
* Hash seguro de senhas

### 🏟️ Ligas

* Criação de ligas por temporada
* Sistema de convite por código
* Associação de usuários às ligas
* Controle de papéis:

  * Dono da liga
  * Membros
* Endpoints para listar membros e alterar papéis

### 📅 Temporadas, Rodadas e Jogos

* Cadastro de temporadas
* Cadastro de rodadas
* Associação de jogos às rodadas
* Suporte a campeonatos com número variável de rodadas

### ✍️ Palpites

* Envio de palpites por jogo
* Validações para evitar palpites inválidos
* Associação correta entre usuário, liga, rodada e jogo

### 🧮 Pontuação e Rankings

* Cálculo automático de pontuação:
  * Pontuação segue a regra de 5 pontos para placar exato, 4 pontos se acertar o vencedor e a diferença de gols, 3 pontos para acertar o resultado vitoria/empate e 0 pontos em caso de erro
* Diferenciação por tipo de acerto
* **Ranking geral da liga**
* **Ranking por rodada**
* **Pontuação total da rodada**
* **Quantidade de acertos por tipo**

### 📈 Consultas Analíticas

* Pontuação acumulada por rodada
* Histórico de evolução do usuário
* Pontuação acumulada de um único usuário
* Listagem de palpites de todos os usuários em uma rodada específica

Essas consultas permitem a criação de gráficos, tabelas comparativas e dashboards no frontend.

---

## 🔄 Fluxo Geral do Sistema

1. Usuário cria uma conta e se autentica
2. Usuário cria ou entra em uma liga via código de convite
3. A liga está associada a uma temporada
4. Cada temporada possui rodadas
5. Cada rodada possui jogos
6. Usuários enviam palpites para os jogos
7. Jogos são finalizados
8. O sistema calcula a pontuação automaticamente
9. Rankings e estatísticas ficam disponíveis

---

## 📦 Estado Atual do Projeto

O backend já possui:

* Modelagem sólida do domínio
* Regras de negócio bem definidas
* Consultas de leitura avançadas
* Base pronta para integração com frontend web ou mobile

Funcionalidades futuras (em stand-by):

* Dashboard visual no frontend
* Gráficos de evolução em tempo real
* Migrações com Alembic
* Deploy em ambiente de produção

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

# rodar a aplicação
uvicorn app.main:app --reload
```

A API ficará disponível em:

```
http://127.0.0.1:8000
```

Documentação automática (Swagger):

```
http://127.0.0.1:8000/docs
```

---

## 📌 Considerações Finais

Este projeto vai além de um CRUD simples, explorando regras de negócio, consultas analíticas e organização arquitetural. Ele foi desenvolvido com foco em aprendizado profundo de backend, SQLAlchemy e FastAPI, servindo tanto como base para um produto real quanto como **projeto de portfólio**.

---

Desenvolvido por: Willian Gomes
