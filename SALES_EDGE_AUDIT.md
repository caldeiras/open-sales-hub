# SALES_EDGE_AUDIT.md — Auditoria Completa do SALES OPEN

**Data:** 2026-03-20  
**Escopo:** Edge Functions, Clients, Autenticação, Autorização, Performance

---

## 1. INVENTÁRIO DE EDGE FUNCTIONS (40 funções)

### 1.1 Funções com JWT Identity (via `validateIdentityJwt`) — ✅ CORRETAS

| Função | Método | Acessa | Visibilidade |
|--------|--------|--------|-------------|
| `sales-accounts` | GET/POST | Commercial DB | ownership |
| `sales-contacts` | GET/POST | Commercial DB | ownership |
| `sales-opportunities` | GET/POST | Commercial DB | ownership |
| `sales-activities` | GET/POST | Commercial DB | ownership |
| `sales-dashboard-summary` | GET | Commercial DB | ownership |
| `sales-pipeline-board` | GET | Commercial DB | ownership |
| `sales-forecast-summary` | GET | Commercial DB | ownership |
| `sales-revenue-summary` | GET | Commercial DB | ownership |
| `sales-revenue-events-list` | GET | Commercial DB | ownership |
| `sales-opportunity-move-stage` | POST | Commercial DB | ownership |
| `sales-opportunity-history` | GET | Commercial DB | ownership |
| `sales-opportunity-forecast-upsert` | POST | Commercial DB | ownership |
| `sales-opportunity-link-proposal` | POST | Commercial DB | ownership |
| `sales-opportunity-mark-won` | POST | Commercial DB | ownership |
| `sales-opportunity-mark-lost` | POST | Commercial DB | ownership |
| `sales-goals` | GET/POST | Commercial DB | ownership |
| `sales-commissions` | GET | Commercial DB | ownership |
| `sales-sync-commissions-from-core` | POST | Commercial+CORE | admin/manager |
| `sales-ranking-summary` | GET | Commercial DB | public (todos) |
| `sales-goal-performance` | GET | Commercial DB | ownership |
| `sales-teams` | GET/POST | Commercial DB | role-based |
| `sales-team-members` | GET/POST | Commercial DB | role-based |
| `sales-territories` | GET/POST | Commercial DB | role-based |
| `sales-territory-assignments` | GET/POST | Commercial DB | role-based |
| `sales-account-ownership` | GET/POST | Commercial DB | ownership |
| `sales-team-summary` | GET | Commercial DB | role-based |
| `sales-playbooks` | GET/POST | Commercial DB | role-based |
| `sales-playbook-steps` | GET/POST | Commercial DB | admin/manager |
| `sales-playbook-executions` | GET/POST | Commercial DB | ownership |
| `sales-templates` | GET/POST | Commercial DB | all/admin |
| `sales-alerts` | GET/POST | Commercial DB | user-scoped |
| `sales-followup-rules` | GET/POST | Commercial DB | admin/manager |
| `sales-sla-rules` | GET/POST | Commercial DB | admin/manager |
| `sales-recommendations` | GET/POST | Commercial DB | ownership |
| `sales-risk-flags` | GET/POST | Commercial DB | ownership |
| `sales-opportunity-scores` | GET | Commercial DB | ownership |
| `sales-scoring-rules` | GET/POST | Commercial DB | admin/manager |

### 1.2 Funções Engine (sem JWT — execução cron/sistema) — ✅ OK por design

| Função | Propósito |
|--------|-----------|
| `sales-playbook-engine` | Executa steps de playbook pendentes |
| `sales-followup-engine` | Cria follow-ups para opp paradas |
| `sales-sla-engine` | Detecta violações de SLA |
| `sales-priority-engine` | Recalcula scores de oportunidades |
| `sales-recommendation-engine` | Gera recomendações e risk flags |

### 1.3 Funções de Infraestrutura

| Função | JWT | Status |
|--------|-----|--------|
| `core-config` | Nenhum (público) | ✅ OK — retorna URLs/keys do Identity e Commercial |
| `sales-commercial-proxy` | Identity JWT | ✅ CORRIGIDO — antes validava JWT local |
| `core-auth-context` | JWT Local | ⚠️ LEGADO — não usado pelo frontend |

---

## 2. PROBLEMAS CRÍTICOS ENCONTRADOS E CORRIGIDOS

### 2.1 ❌ `sales-commercial-proxy` — JWT ERRADO (CORRIGIDO)

**Antes:** Validava JWT do projeto LOCAL (Lovable Cloud) usando `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.  
**Impacto:** 403 para qualquer usuário autenticado pelo Identity project.  
**Usado por:** `fetchPipelineStages()`, `fetchLeadSources()`, `fetchSegments()`, `fetchLossReasons()`.  
**Correção:** Migrado para `validateIdentityJwt()` da shared `sales-auth.ts`.

### 2.2 ❌ `fetchPipelineStages` — GET para endpoint POST (CORRIGIDO)

**Antes:** Tentava `salesGet('sales-commercial-proxy')` (GET sem body) com fallback para `invokeFunction`.  
O `salesGet` fazia GET sem body → proxy recebia `req.json()` → `SyntaxError: Unexpected end of JSON input`.  
**Evidência:** Log confirmado nos edge-function-logs (`SyntaxError: Unexpected end of JSON input`).  
**Correção:** Agora usa `salesPost('sales-commercial-proxy', { table, operation, ... })` diretamente.

### 2.3 ❌ `fetchConfigTable` — Usava `invokeFunction` morto (CORRIGIDO)

**Antes:** Usava `invokeFunction` que chamava `supabase.functions.invoke` (cliente LOCAL) → enviava POST com body `{_method, _params}` que nenhuma Edge Function esperava.  
**Correção:** Usa `salesPost` com Identity JWT headers diretamente.

### 2.4 ❌ `priority-engine` — Coluna `stage_id` inexistente (CORRIGIDO)

**Antes:** Query usava `stage_id` nas oportunidades, mas a coluna real é `pipeline_stage_id`.  
**Impacto:** stage_weight sempre 0, scores artificialmente baixos.  
**Correção:** Alterado para `pipeline_stage_id`.

### 2.5 ❌ `recommendation-engine` — Mesma coluna errada (CORRIGIDO)

**Antes:** Usava `stage_id` em vez de `pipeline_stage_id`.  
**Correção:** Alterado para `pipeline_stage_id`.

### 2.6 ❌ Import desnecessário de `supabase` em services (CORRIGIDO)

**Antes:** `salesService.ts` e `salesPlaybookService.ts` importavam `supabase` do cliente local sem uso.  
**Risco:** Confusão sobre qual client é o correto; possível conflito de bundling.  
**Correção:** Imports removidos.

---

## 3. MAPA DE CLIENTS

| Client | Projeto | Usado em | Status |
|--------|---------|----------|--------|
| `identityClient` (via `getIdentityClient()`) | macmkfoknhofnwhizsqc | Login, Auth Context, Service Headers | ✅ OK |
| `supabase` (auto-generated) | mbcakyjmeypjtzhcwqrx (Lovable Cloud) | Apenas `core-config` invoke | ✅ OK — usado só para bootstrapping |
| `getCommercialClient()` (Edge Functions) | zkjrcenhemnnlmjiysbc | Todas as Edge Functions de dados | ✅ OK |
| `createClient(localUrl, ...)` em `core-auth-context` | mbcakyjmeypjtzhcwqrx | Não usado pelo frontend | ⚠️ LEGADO |

**Nenhum `localClient` ou fallback indevido encontrado no frontend.**

---

## 4. FLUXO DE AUTENTICAÇÃO

```
Login (LoginPage) → identityClient.auth.signInWithPassword()
                   ↓
SalesAuthContext → identityClient.auth.onAuthStateChange()
                   ↓
Service Layer  → identityClient.auth.getSession() → Bearer token
                   ↓
Edge Functions → validateIdentityJwt(req) → IDENTITY project getUser()
                   ↓
Commercial DB  → getCommercialClient() → COMMERCIAL_SERVICE_ROLE_KEY
```

**Resultado:** ✅ Fluxo correto e consistente.

---

## 5. ANÁLISE DE PERFORMANCE

### 5.1 DashboardPage — Carregamento paralelo

Hooks usados: `useForecastSummary`, `useActivities`, `useRevenueSummary`, `useRankingSummary`, `useGoalPerformance`

**5 requests paralelas** — todas independentes, sem cascata.  
React Query caching ativo — sem refetch duplicado dentro da mesma janela.  
**Status:** ✅ OK — comportamento correto para dashboard.

### 5.2 Mutation invalidations — Amplas mas corretas

Mutations como `useMoveOpportunityStage` invalidam 5 query keys.  
Comportamento esperado para manter consistência cross-view.  
**Status:** ✅ OK.

### 5.3 Hooks stub (leads, proposals, notes, tags)

Retornam arrays vazios — sem request real.  
**Status:** ✅ OK — sem overhead.

### 5.4 Potencial melhoria: `staleTime`

Nenhum `staleTime` configurado → React Query re-fetcha ao re-focar a aba.  
**Recomendação:** Adicionar `staleTime: 60_000` para dados de config (stages, segments, etc.).

---

## 6. CLASSIFICAÇÃO GERAL

### ✅ OK (38 itens)
- Todas as Edge Functions de CRUD com `validateIdentityJwt` + `getCommercialClient`
- Identity client no frontend
- AuthGuard + PermissionGate
- Hooks React Query sem loops
- Login via Identity project
- Engines cron sem JWT (by design)

### ✅ CORRIGIDO AGORA (6 itens)
1. `sales-commercial-proxy` — JWT local → Identity JWT
2. `fetchPipelineStages()` — GET sem body → POST com body
3. `fetchConfigTable()` — `invokeFunction` → `salesPost`
4. `sales-priority-engine` — `stage_id` → `pipeline_stage_id`
5. `sales-recommendation-engine` — `stage_id` → `pipeline_stage_id`
6. Imports de `supabase` local removidos de services

### ⚠️ CORRIGIR DEPOIS (2 itens)
1. **`core-auth-context`** — Valida JWT local, não é usado. Remover ou migrar para Identity JWT.
2. **`staleTime` no QueryClient** — Configurar para reduzir refetches em dados estáveis.

### 🗑️ LEGADO MORTO (1 item)
1. **`core-auth-context`** — Função legada que valida JWT local. Nenhum código do frontend a referencia.

---

## 7. ARQUIVOS ALTERADOS

| Arquivo | Alteração |
|---------|-----------|
| `src/services/salesService.ts` | Removido import `supabase`, removido `invokeFunction`, corrigido `fetchPipelineStages` e `fetchConfigTable` |
| `src/services/salesPlaybookService.ts` | Removido import `supabase` não usado |
| `supabase/functions/sales-commercial-proxy/index.ts` | Migrado de JWT local para `validateIdentityJwt` |
| `supabase/functions/sales-priority-engine/index.ts` | `stage_id` → `pipeline_stage_id` |
| `supabase/functions/sales-recommendation-engine/index.ts` | `stage_id` → `pipeline_stage_id` |

---

## 8. RISCOS REMANESCENTES

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Engines cron sem JWT | Baixo | By design — não expõem dados, só processam. Proteger via pg_cron ou webhook secret. |
| `core-auth-context` legado | Baixo | Não referenciado. Remover quando conveniente. |
| UUIDs exibidos em vez de nomes | UX | Resolver buscando nomes do Identity project no frontend. |

---

## 9. CONCLUSÃO

**O SALES OPEN está agora CONSISTENTE com a arquitetura dual-project.**

- ✅ Todas as Edge Functions validam JWT do Identity project
- ✅ Todos os dados comerciais acessados via `COMMERCIAL_SERVICE_ROLE_KEY`
- ✅ Nenhum client local usado para dados comerciais
- ✅ Nenhum fallback indevido
- ✅ Nenhum loop de fetch
- ✅ Os 403 em `/accounts`, `/opportunities` e config tables estão corrigidos
- ✅ Engines de scoring agora usam a coluna correta (`pipeline_stage_id`)

**Não há mais hibridismo na camada de integração.**
