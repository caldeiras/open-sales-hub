# Arquitetura do SALES OPEN

## Visão Geral

O SALES OPEN é o módulo de execução comercial do ecossistema OPEN. Ele opera como um frontend React que se comunica exclusivamente via **Edge Functions** com dois projetos Supabase distintos.

## Projetos Supabase

| Projeto | Função | Responsabilidade |
|---------|--------|-----------------|
| **Identity (CORE)** | Autenticação e RBAC | JWT, roles, perfis de usuário |
| **Commercial (CORE)** | Dados comerciais | Accounts, opportunities, pipeline, revenue |
| **SALES (este)** | Orquestração | Config tables, Edge Functions de proxy |

## Fluxo de Autenticação

```
Usuário → LoginPage → Identity Project (auth.signInWithPassword)
       → JWT emitido pelo Identity Project
       → JWT enviado nas Edge Functions do SALES
       → Edge Function valida JWT contra Identity Project
       → Edge Function usa service_role para acessar Commercial DB
       → Dados retornam ao frontend
```

## Princípios

1. **Sem auth local** — toda autenticação vem do Identity Project
2. **Sem acesso direto ao DB** — todo CRUD passa por Edge Functions
3. **Service role isolado** — apenas Edge Functions usam `COMMERCIAL_SERVICE_ROLE_KEY`
4. **RLS deny-all** — tabelas locais bloqueiam acesso direto via client
5. **Ownership enforcement** — vendedor só vê seus dados, gerente vê o time, admin vê tudo

## Stack Tecnológico

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **State**: TanStack React Query
- **Routing**: React Router v6
- **Backend**: Supabase Edge Functions (Deno)
- **Auth**: Supabase Auth (Identity Project)
- **Database**: PostgreSQL (Commercial Project)

## Diagrama de Camadas

```
┌─────────────────────────────────┐
│         Frontend (React)        │
│  Pages → Hooks → Services      │
├─────────────────────────────────┤
│      Edge Functions (Deno)      │
│  JWT validation + RBAC + CRUD   │
├──────────────┬──────────────────┤
│ Identity DB  │  Commercial DB   │
│ (auth/roles) │  (sales data)    │
└──────────────┴──────────────────┘
```
