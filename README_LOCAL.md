# Guia de Configuração Local - Tournament Manager

Este guia ajudará você a rodar o projeto localmente para testes e correções.

## Pré-requisitos
- [Node.js](https://nodejs.org/) (v18 ou superior)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (opcional, para rodar o banco de dados facilmente)

## Passo a Passo

1. **Instalar Dependências**
   ```bash
   pnpm install
   ```

2. **Configuração do Banco de Dados**
   - Se tiver o Docker, suba o MySQL com:
     ```bash
     docker compose up -d
     ```
   - Renomeie o arquivo `.env.example` para `.env` e ajuste as credenciais se necessário.

3. **Subi o Schema do Banco**
   ```bash
   pnpm db:push
   ```

4. **Rodar em Modo Desenvolvimento**
   ```bash
   pnpm dev
   ```
   O servidor estará disponível em `http://localhost:3000`.

## Scripts Úteis
- `pnpm build`: Gera o build de produção.
- `pnpm test`: Executa os testes unitários.
- `pnpm format`: Formata o código com Prettier.
