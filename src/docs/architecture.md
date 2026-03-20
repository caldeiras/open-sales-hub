# SALES OPEN — Documento de Arquitetura

> Versão: 1.0 · Atualizado: 2026-03-20

---

## 1. Visão Geral

O SALES OPEN é o módulo de execução comercial do ecossistema OPEN. Ele não é um monolito — é uma aplicação frontend que orquestra três domínios físicos separados, cada um com responsabilidade distinta.

### Componentes

| Componente | Tecnologia | Projeto Supabase | Responsabilidade |
|---|---|---|---|
| **Frontend** | React 18 + Vite + TypeScript | Lovable Cloud (`mbcakyjmeypjtzhcwqrx`) | UI, estado, navegação, chamadas a Edge Functions |
| **Identity** | Supabase Auth | CORE Identity (`macmkfoknhofnwhizsqc`) | Autenticação, sessão, JWT, roles, perfis |
| **Edge Functions** | Deno (Supabase Functions) | Lovable Cloud (`mbcakyjmeypjtzhcwqrx`) | Validação JWT, RBAC, proxy para banco comercial |
| **Banco Comercial** | PostgreSQL | CORE Comercial (`zkjrcenhemnnlmjiysbc`) | Dados de vendas: accounts, opportunities, pipeline, revenue |

### Por que três projetos?

O CORE já existia antes do SALES. Autenticação e dados comerciais são domínios do CORE. O SALES nasceu como **camada de execução** — ele consome, orquestra e exibe, mas não é dono dos dados fundamentais.

Tentar centralizar tudo em um projeto geraria:
- Duplicação de usuários
- Conflito de roles
- Dois sistemas de auth competindo
- Dados comerciais fora da governança do CORE

---

## 2. Fluxo de Dados

### Request completo (leitura)

```
┌──────────┐     JWT        ┌──────────────┐    service_role    ┌──────────────┐
│ Frontend │ ──────────────→ │ Edge Function │ ────────────────→ │ Commercial   │
│ (React)  │ Authorization  │ (Deno)        │ COMMERCIAL_       │ Database     │
│          │ Bearer <token> │               │ SERVICE_ROLE_KEY  │ (PostgreSQL) │
└──────────┘                └───────┬───────┘                   └──────────────┘
                                    │
                            Valida JWT contra
                            Identity Project
                            (JWKS endpoint)
                                    │
                                    ▼
                            ┌──────────────┐
                            │ Identity     │
                            │ Project      │
                            │ (Auth/RBAC)  │
                            └──────────────┘
```

### Passo a passo

1. **Usuário faz login** → `identityClient.auth.signInWithPassword()` contra Identity Project
2. **JWT é emitido** pelo Identity Project com `user_id` e metadata
3. **Frontend armazena sessão** via `identityClient` (Supabase JS SDK)
4. **Request de dados** → frontend chama Edge Function com `Authorization: Bearer <jwt>`
5. **Edge Function valida JWT** → verifica assinatura contra `IDENTITY_JWT_SECRET` (JWKS do Identity Project)
6. **Edge Function extrai roles** → consulta `sales_user_roles` no Identity Project via `IDENTITY_SERVICE_ROLE_KEY`
7. **Edge Function aplica RBAC** → filtra dados por ownership (admin/gerente/vendedor)
8. **Edge Function acessa Commercial DB** → usa `COMMERCIAL_SERVICE_ROLE_KEY` para operar no banco comercial
9. **Dados retornam** → JSON para o frontend, consumido via React Query

### Request de escrita

Mesmo fluxo, com validações adicionais:
- Território: vendedor só cria dentro do seu território
- Ownership: conta sempre nasce com `owner_user_id`
- Deduplicação: CNPJ/domínio únicos
- Integridade: foreign keys validadas

---

## 3. Princípios Arquiteturais

### 3.1 Não duplicar autenticação

O SALES **nunca** gerencia usuários, senhas, sessões ou roles diretamente. Tudo vem do Identity Project.

```
❌ supabase.auth.signUp()          // no projeto local
❌ localStorage.setItem('role')    // role no client
❌ createClient(LOCAL_URL, ...)    // auth local

✅ identityClient.auth.signIn()   // contra Identity Project
✅ validateIdentityJwt(req)       // nas Edge Functions
✅ auth.roles (extraído do JWT)   // roles do Identity
```

### 3.2 Não acessar banco diretamente

Nenhuma query do frontend vai diretamente ao banco comercial. Toda operação passa por Edge Function.

```
❌ supabase.from('sales_accounts').select()   // client direto
❌ fetch(`${COMMERCIAL_URL}/rest/v1/...`)     // REST direto

✅ salesGet('sales-accounts')                 // via Edge Function
✅ salesPost('sales-opportunities', data)     // via Edge Function
```

### 3.3 Tudo via Edge Functions

As Edge Functions são a **única porta de entrada** para dados comerciais. Elas:
- Validam JWT
- Extraem roles
- Aplicam filtro de ownership
- Operam com `service_role` no banco comercial
- Retornam dados filtrados

### 3.4 UUID como identidade única

O `user_id` (UUID) emitido pelo Identity Project é a chave universal. Ele aparece em:
- `owner_user_id` (accounts, opportunities, leads)
- `created_by_user_id` (atividades, metas)
- `manager_user_id` (times)
- `user_id` (team_members, territory_assignments)

Não existe nome de usuário, email ou login como identificador em tabelas comerciais — apenas UUID.

---

## 4. Problemas Evitados

### 4.1 Duplicação de usuário

Se o SALES tivesse auth próprio, cada vendedor teria **dois** registros de usuário: um no CORE e outro no SALES. Qualquer mudança de senha, email ou role teria que ser sincronizada manualmente.

**Solução**: auth único no Identity Project. O SALES consome o JWT existente.

### 4.2 Inconsistência de roles

Se roles fossem armazenadas no SALES, um vendedor promovido a gerente no CORE continuaria com role antiga no SALES até alguém sincronizar manualmente.

**Solução**: roles vivem no Identity Project. Edge Functions consultam roles em tempo real a cada request.

### 4.3 Bypass de segurança

Se o frontend acessasse o banco comercial diretamente (via REST API do Supabase), qualquer usuário com o `anon_key` poderia manipular queries. RLS não funciona cross-project (o JWT do Identity não é reconhecido pelo banco comercial).

**Solução**: RLS deny-all no banco local. Acesso comercial apenas via `service_role` nas Edge Functions, após validação JWT.

### 4.4 Dados órfãos

Sem foreign keys e ownership enforcement, contas poderiam existir sem dono, oportunidades sem conta, atividades sem contexto.

**Solução**: constraints no banco (`owner_user_id NOT NULL`, `UNIQUE WHERE active = true`), validação nas Edge Functions, e triggers de proteção.

---

## 5. Diagrama Lógico

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Pages   │→ │  Hooks   │→ │ Services │→ │  fetch() │       │
│  │          │  │ (RQuery) │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘       │
│                                                   │             │
│  identityClient ← Identity Project (auth only)   │             │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                                          JWT + apikey
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS (Deno)                         │
│                    Projeto: Lovable Cloud                        │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ validateJwt()   │→ │ extractRoles()  │→ │ ownershipFilter│ │
│  │ (Identity JWKS) │  │ (Identity DB)   │  │ (RBAC logic)   │ │
│  └─────────────────┘  └─────────────────┘  └───────┬────────┘ │
│                                                      │         │
│  Secrets:                                            │         │
│  - IDENTITY_PROJECT_URL                              │         │
│  - IDENTITY_JWT_SECRET                               │         │
│  - COMMERCIAL_SUPABASE_URL                           │         │
│  - COMMERCIAL_SERVICE_ROLE_KEY                       │         │
└──────────────────────────────────────────────────────┼─────────┘
                                                       │
                                             service_role
                                                       │
                          ┌────────────────────────────┼──────────┐
                          │                            ▼          │
                          │  ┌──────────────────────────────────┐ │
                          │  │        COMMERCIAL DATABASE       │ │
                          │  │     Projeto: CORE Comercial      │ │
                          │  │                                  │ │
                          │  │  sales_accounts                  │ │
                          │  │  sales_opportunities             │ │
                          │  │  sales_leads                     │ │
                          │  │  sales_activities                │ │
                          │  │  sales_teams                     │ │
                          │  │  sales_territories               │ │
                          │  │  sales_playbooks                 │ │
                          │  │  sales_goals                     │ │
                          │  │  ... (+30 tabelas)               │ │
                          │  └──────────────────────────────────┘ │
                          │         CORE Comercial                │
                          └───────────────────────────────────────┘
```

---

## 6. Pontos Críticos

### 6.1 Validação JWT cross-project

O JWT é emitido pelo Identity Project (`macmkfoknhofnwhizsqc`). As Edge Functions rodam no projeto Lovable Cloud (`mbcakyjmeypjtzhcwqrx`). Isso significa que:

- `auth.uid()` nas Edge Functions retorna `null` (JWT não pertence ao projeto local)
- Não é possível usar RLS convencional no projeto local
- A validação deve ser **manual**: verificar assinatura com `IDENTITY_JWT_SECRET`

**Implementação**: `_shared/sales-auth.ts` → `validateIdentityJwt(req)` extrai `user_id` e consulta roles.

**Risco**: se `IDENTITY_JWT_SECRET` vazar, qualquer pessoa pode forjar JWTs válidos.

**Mitigação**: secret rotacionável, nunca exposto no frontend, usado apenas em Edge Functions.

### 6.2 Uso de service_role_key

O `COMMERCIAL_SERVICE_ROLE_KEY` dá acesso **total** ao banco comercial. Ele bypassa qualquer RLS.

**Risco**: se vazar, acesso irrestrito a todos os dados comerciais.

**Mitigação**:
- Nunca exposto no frontend
- Usado apenas dentro de Edge Functions
- Cada Edge Function aplica RBAC manualmente antes de retornar dados
- Logs de acesso auditáveis

### 6.3 Isolamento identity ↔ comercial

Os dois projetos Supabase são completamente independentes. Não compartilham:
- Banco de dados
- Autenticação
- RLS policies
- Service role keys

**Benefício**: comprometimento de um projeto não afeta o outro.

**Custo**: complexidade de integração (resolvida pelas Edge Functions).

### 6.4 Latência de validação

Cada request faz:
1. Validação JWT (verificação criptográfica)
2. Consulta de roles (query ao Identity DB)
3. Query ao banco comercial

Três operações de rede por request.

**Mitigação futura**: cache de roles por sessão (TTL 5min), batch queries, connection pooling.

---

## 7. Roadmap Técnico

### 7.1 Preparação para IA (Fase 9+)

A Fase 9 implementou scoring, priorização e recomendações com **regras determinísticas**. A base está preparada para evolução:

| Atual | Futuro |
|-------|--------|
| Score = regras fixas (peso × valor) | Score = modelo ML treinado em histórico |
| Recomendação = if/then | Recomendação = LLM com contexto |
| Risk flag = threshold fixo | Risk flag = detecção de anomalia |
| Prioridade = fórmula | Prioridade = predição de conversão |

**Pré-requisitos para IA**:
- Histórico de atividades suficiente (>6 meses)
- Volume de oportunidades (>500 fechadas)
- Pipeline de dados limpo (scores calculados consistentemente)
- Edge Function `sales-ai-engine` com acesso a modelo via API

**Modelos candidatos** (Lovable AI):
- `google/gemini-2.5-flash` — scoring e classificação
- `openai/gpt-5-mini` — geração de recomendações textuais
- `google/gemini-2.5-pro` — análise complexa de pipeline

### 7.2 Escalabilidade de Engines

Os engines atuais (playbook, follow-up, SLA, priority, recommendation) rodam sob demanda. Para escalar:

| Engine | Atual | Futuro |
|--------|-------|--------|
| Playbook | Manual/agendado | Cron job (pg_cron ou external) |
| Follow-up | Manual | Trigger on update |
| SLA | Manual | Cron job a cada hora |
| Priority | Manual | Recálculo noturno automático |
| Recommendation | Manual | Event-driven (após atividade) |

**Pré-requisitos**:
- pg_cron habilitado no banco comercial
- Ou serviço externo de agendamento (cron job)
- Monitoramento de execução (logs + alertas)
- Trava de concorrência robusta (já implementada com `last_execution_at`)

### 7.3 Multi-tenancy (futuro distante)

A arquitetura atual assume um único tenant (OPEN). Para multi-tenancy:
- Adicionar `tenant_id` em todas as tabelas comerciais
- Filtrar por tenant em cada Edge Function
- Separar Identity por tenant ou usar custom claims
- Avaliar banco por tenant vs schema por tenant vs row-level isolation

### 7.4 Observabilidade

| Aspecto | Atual | Futuro |
|---------|-------|--------|
| Logs | `console.error` nas EFs | Structured logging + aggregation |
| Métricas | Nenhuma | Request count, latência p95, error rate |
| Alertas | `sales_alerts` (app) | Alertas de infra (downtime, error spike) |
| Tracing | Nenhum | Request ID propagado frontend → EF → DB |

---

## Apêndice: Secrets

| Secret | Onde é usado | Propósito |
|--------|-------------|-----------|
| `IDENTITY_PROJECT_URL` | Edge Functions | URL do Identity Project para validação JWT |
| `IDENTITY_JWT_SECRET` | Edge Functions | Verificar assinatura do JWT |
| `IDENTITY_SERVICE_ROLE_KEY` | Edge Functions | Consultar roles no Identity DB |
| `COMMERCIAL_SUPABASE_URL` | Edge Functions | URL do banco comercial |
| `COMMERCIAL_SERVICE_ROLE_KEY` | Edge Functions | Operar no banco comercial |
| `VITE_SUPABASE_URL` | Frontend | URL do projeto local (Edge Functions) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Anon key do projeto local |
| `IDENTITY_SUPABASE_URL` | Frontend (via EF) | URL do Identity para auth |
| `IDENTITY_SUPABASE_ANON_KEY` | Frontend (via EF) | Anon key do Identity para auth |
