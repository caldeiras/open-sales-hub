# FASE 1B — SALES OPEN Dual Architecture Report

**Data**: 2026-03-20  
**Status**: ✅ Auditoria completa, arquitetura validada

---

## 1. Mapa de Clients

| Client | Projeto Supabase | Ref | Uso |
|--------|-----------------|-----|-----|
| **identityClient** | CORE Identity | `macmkfoknhofnwhizsqc` | Auth (signIn, signOut, getSession, getUser), profiles, user_roles, roles, RBAC |
| **commercialClient** | CORE Commercial | `zkjrcenhemnnlmjiysbc` | Propostas, contratos, pricing do CORE (futuro) |
| **localClient** | SALES Lovable Cloud | `mbcakyjmeypjtzhcwqrx` | Tabelas `sales_*` próprias, config tables, Edge Functions |

---

## 2. Auditoria de Auth (identityClient)

| Operação | Arquivo | Client | Status |
|----------|---------|--------|--------|
| `signInWithPassword` | `src/pages/LoginPage.tsx` | identityClient ✅ | Correto |
| `onAuthStateChange` | `src/contexts/SalesAuthContext.tsx` | identityClient ✅ | Correto |
| `getSession` | `src/contexts/SalesAuthContext.tsx` | identityClient ✅ | Correto |
| `signOut` | `src/contexts/SalesAuthContext.tsx` | identityClient ✅ | Correto |
| profiles (SELECT) | `src/contexts/SalesAuthContext.tsx` | identityClient ✅ | Correto |
| user_roles + roles (SELECT) | `src/contexts/SalesAuthContext.tsx` | identityClient ✅ | Correto |
| `hasRole` / `hasAnyRole` | `src/contexts/SalesAuthContext.tsx` | Baseado em roles do identityClient ✅ | Correto |

**Nenhuma operação de auth usa commercialClient ou localClient.**

---

## 3. Auditoria do Domínio Comercial

| Operação | Arquivo | Client | Status |
|----------|---------|--------|--------|
| `sales_pipeline_stages` | `src/services/salesService.ts` | localClient ✅ | Correto — tabela local |
| `sales_lead_sources` | `src/services/salesService.ts` | localClient ✅ | Correto — tabela local |
| `sales_segments` | `src/services/salesService.ts` | localClient ✅ | Correto — tabela local |
| `sales_loss_reasons` | `src/services/salesService.ts` | localClient ✅ | Correto — tabela local |
| `sales_opportunities` | `src/services/salesService.ts` | localClient ✅ | Tabela ainda não existe (Fase 2) |
| `sales_accounts` | `src/services/salesService.ts` | localClient ✅ | Tabela ainda não existe (Fase 2) |
| `sales_contacts` | `src/services/salesService.ts` | localClient ✅ | Tabela ainda não existe (Fase 2) |
| `sales_activities` | `src/services/salesService.ts` | localClient ✅ | Tabela ainda não existe (Fase 2) |

**O commercialClient não está sendo usado em nenhuma operação atual.** Está disponível para consumo futuro de dados do CORE Commercial.

---

## 4. Validação do RBAC

| Componente | Mecanismo | Fonte dos Roles | Status |
|------------|-----------|----------------|--------|
| `AuthGuard` | `isAuthenticated` + `hasAnyRole` | identityClient → profiles → user_roles → roles | ✅ Real |
| `PermissionGate` | `roles.includes()` | identityClient via SalesAuthContext | ✅ Real |
| `AppSidebar` (Admin) | `hasRole('admin') \|\| hasRole('gerente_comercial')` | identityClient via SalesAuthContext | ✅ Real |
| `AppSidebar` (Sair) | `signOut` | identityClient | ✅ Real |

**Nenhum fallback fake, hardcoded ou localStorage-based encontrado.**

Roles reconhecidos pelo SALES: `admin`, `gerente_comercial`, `comercial`, `cs`, `arquiteto`, `bdr`, `parceiro`

---

## 5. Cross-Project JWT — Análise de Viabilidade

### ⚠️ Limitação fundamental

O JWT emitido por `macmkfoknhofnwhizsqc` (Identity) **não é aceito** por `zkjrcenhemnnlmjiysbc` (Commercial). São projetos Supabase independentes com secrets JWT distintos.

### Consequências práticas

| Operação no Commercial | Acesso direto (commercialClient) | Via Edge Function proxy |
|------------------------|--------------------------------|----------------------|
| SELECT público (anon) | ✅ Funciona se RLS permitir anon | ✅ |
| SELECT autenticado | ❌ JWT inválido | ✅ Com service role key |
| INSERT/UPDATE/DELETE | ❌ JWT inválido | ✅ Com service role key |

### Operações que PODEM usar commercialClient diretamente

- Leitura de tabelas com RLS configurado para `anon` (dados públicos do catálogo, pricing público)
- Qualquer tabela sem RLS habilitado no projeto comercial

### Operações que EXIGEM Edge Function proxy

- Leitura de dados protegidos por RLS (propostas do usuário, contratos específicos)
- Qualquer escrita no projeto comercial
- Operações que precisem vincular o user_id do Identity ao contexto do Commercial

---

## 6. Secrets Configurados

| Secret | Valor esperado | Usado por |
|--------|---------------|-----------|
| `IDENTITY_SUPABASE_URL` | `https://macmkfoknhofnwhizsqc.supabase.co` | core-config → identityClient |
| `IDENTITY_SUPABASE_ANON_KEY` | anon key com ref `macmkfoknhofnwhizsqc` | core-config → identityClient |
| `COMMERCIAL_SUPABASE_URL` | `https://zkjrcenhemnnlmjiysbc.supabase.co` | core-config → commercialClient |
| `COMMERCIAL_SUPABASE_ANON_KEY` | anon key com ref `zkjrcenhemnnlmjiysbc` | core-config → commercialClient |
| `CORE_SUPABASE_URL` | ⚠️ Legado — pode ser removido | core-auth-context (legado) |
| `CORE_SUPABASE_ANON_KEY` | ⚠️ Legado — pode ser removido | core-auth-context (legado) |

---

## 7. Arquivos do SALES OPEN — Estado Atual

### Clients
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/identityClient.ts` | Client para Identity project |
| `src/lib/commercialClient.ts` | Client para Commercial project |
| `src/integrations/supabase/client.ts` | Client local (auto-gerado, NÃO editar) |

### Auth
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/contexts/SalesAuthContext.tsx` | Provider com user, session, profile, roles |
| `src/pages/LoginPage.tsx` | Tela de login (identityClient) |
| `src/components/sales/AuthGuard.tsx` | Route guard |
| `src/components/sales/PermissionGate.tsx` | UI permission gate |

### Edge Functions
| Arquivo | Responsabilidade |
|---------|-----------------|
| `supabase/functions/core-config/index.ts` | Fornece URLs + anon keys de ambos projetos |
| `supabase/functions/core-auth-context/index.ts` | Proxy de auth context (legado, pode ser removido) |

### Domain
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/services/salesService.ts` | Queries sales_* via localClient |
| `src/hooks/useSalesData.ts` | React Query hooks para salesService |

---

## 8. Recomendação para Fase 2

### Prioridade 1 — Tabelas transacionais (localClient)
Criar no banco local do SALES:
1. `sales_accounts` — empresas/contas
2. `sales_contacts` — contatos vinculados a accounts
3. `sales_opportunities` — oportunidades com stage, owner, account
4. `sales_activities` — tarefas, reuniões, ligações
5. `sales_notes` — notas polimórficas (entity_type + entity_id)

RLS: todas com policy por `owner_user_id = auth.uid()` — porém o `auth.uid()` será do **local project**, não do Identity. Isso exige uma decisão:

#### ⚠️ Decisão crítica de RLS para Fase 2

O `auth.uid()` nas RLS policies do banco local retorna o UID do Lovable Cloud, **não** o UID do CORE Identity. Como o usuário NÃO faz login no Lovable Cloud, `auth.uid()` será `null`.

**Opções:**
1. **Desabilitar RLS** nas tabelas sales_* e controlar acesso somente via Edge Functions
2. **Criar Edge Functions CRUD** que usam service role key local e validam o JWT do Identity manualmente
3. **Usar RLS com anon access** para SELECT + Edge Functions para writes
4. **Sincronizar sessão** — fazer login silencioso no local project quando o Identity auth confirma (complexo)

**Recomendação**: Opção 2 — Edge Functions CRUD com validação manual do JWT do Identity. Mais seguro e mantém a separação.

### Prioridade 2 — Proxy para CORE Commercial
Criar Edge Functions que:
- Recebem JWT do Identity
- Validam o usuário
- Usam service role key do Commercial para ler/escrever dados

### Prioridade 3 — CRUD completo
Implementar formulários de criação/edição para accounts, contacts, opportunities, activities.

---

## 9. Riscos Remanescentes

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| `auth.uid()` retorna null nas RLS do banco local | 🔴 Alta | Usar Edge Functions com service role |
| JWT do Identity não autentica no Commercial | 🟡 Média | Edge Function proxy com service role |
| Secrets `CORE_SUPABASE_*` legados podem confundir | 🟢 Baixa | Remover após confirmar que tudo usa `IDENTITY_*` |
| `core-auth-context` Edge Function usa secrets legados | 🟡 Média | Já corrigido para usar `IDENTITY_*` |
