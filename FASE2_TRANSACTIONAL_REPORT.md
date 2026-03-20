# FASE 2 — SALES OPEN: Camada Transacional

**Data**: 2026-03-20  
**Status**: Implementação completa, aguardando execução do SQL no comercial

---

## 1. SQL de Migração

Arquivo: `/mnt/documents/SALES_PHASE2_TRANSACTIONAL.sql`

| Tabela | Campos-chave | Índices |
|--------|-------------|---------|
| `sales_accounts` | name, legal_name, document_number, segment_id, lead_source_id, owner_user_id, status | owner_user_id, status, segment_id |
| `sales_contacts` | account_id (FK cascade), full_name, email, phone, job_title, is_primary, owner_user_id | account_id, owner_user_id |
| `sales_opportunities` | account_id (FK), title, pipeline_stage_id (FK), owner_user_id, amount, monthly_value, close_date, status, temperature, loss_reason_id | owner_user_id, account_id, pipeline_stage_id, status, close_date |
| `sales_opportunity_contacts` | opportunity_id (FK cascade), contact_id (FK cascade), role, UNIQUE(opp+contact) | — |
| `sales_activities` | account_id, opportunity_id, contact_id, activity_type, subject, due_at, status, owner_user_id, created_by_user_id | owner_user_id, account_id, opportunity_id, status, due_at |

Todas com: UUID PK, trigger `updated_at`, RLS habilitado (SELECT público, writes via service role).

---

## 2. Edge Functions Criadas

| Função | Método | Operação |
|--------|--------|----------|
| `sales-accounts` | GET/POST | List (filtrado por ownership) / Upsert |
| `sales-contacts` | GET/POST | List / Upsert |
| `sales-opportunities` | GET/POST | List + Detail / Upsert |
| `sales-activities` | GET/POST | List / Upsert |
| `_shared/sales-auth.ts` | — | Validação JWT Identity + helper ownership + commercial client |

---

## 3. Matriz de Autorização

| Role | Ver próprios | Ver todos | Criar | Editar próprios | Editar todos |
|------|-------------|-----------|-------|-----------------|-------------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `gerente_comercial` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comercial` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `cs` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `parceiro` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `bdr` | ❌ | ❌ | ❌ | ❌ | ❌ |

Roles sem acesso comercial (`cs`, `parceiro`, `bdr`, `arquiteto`) recebem HTTP 403.

---

## 4. Arquivos Criados/Alterados

### Criados
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/_shared/sales-auth.ts` | Auth helper compartilhado |
| `supabase/functions/sales-accounts/index.ts` | CRUD de contas |
| `supabase/functions/sales-contacts/index.ts` | CRUD de contatos |
| `supabase/functions/sales-opportunities/index.ts` | CRUD de oportunidades |
| `supabase/functions/sales-activities/index.ts` | CRUD de atividades |
| `/mnt/documents/SALES_PHASE2_TRANSACTIONAL.sql` | SQL para execução manual |

### Alterados
| Arquivo | Mudança |
|---------|---------|
| `src/services/salesService.ts` | Reescrito para chamar Edge Functions dedicadas |
| `src/hooks/useSalesData.ts` | Adicionados hooks de mutação (useUpsert*) |
| `src/pages/sales/AccountsPage.tsx` | CRUD completo com dialog |
| `src/pages/sales/ContactsPage.tsx` | CRUD completo com dialog |
| `src/pages/sales/OpportunitiesPage.tsx` | CRUD completo com dialog |
| `src/pages/sales/ActivitiesPage.tsx` | CRUD completo com dialog |

---

## 5. Checklist de Teste

- [ ] Executar `SALES_PHASE2_TRANSACTIONAL.sql` no projeto comercial
- [ ] Login com usuário com role `comercial` → ver apenas registros próprios
- [ ] Login com `gerente_comercial` → ver todos os registros
- [ ] Login com `admin` → ver todos os registros
- [ ] Criar empresa → persiste no comercial com owner_user_id correto
- [ ] Editar empresa própria → sucesso
- [ ] Tentar editar empresa de outro → bloqueado (role comercial)
- [ ] Criar oportunidade vinculada a empresa → persiste
- [ ] Criar atividade vinculada a oportunidade → persiste
- [ ] Usuário com role `cs` → recebe 403 nas Edge Functions
