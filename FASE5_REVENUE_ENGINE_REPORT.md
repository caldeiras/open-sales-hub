# FASE 5 — SALES OPEN: Revenue Engine (MRR, TCV, Expansion, Churn)

**Data**: 2026-03-20  
**Status**: Implementação completa, aguardando execução do SQL no comercial

---

## 1. SQL de Migração

Arquivo: `/mnt/documents/SALES_PHASE5_REVENUE_ENGINE.sql`

| Alteração | Detalhes |
|-----------|---------|
| `contract_type` | text, CHECK: 'recurring', 'one_time' |
| `billing_cycle` | text, CHECK: 'monthly', 'annual', 'one_time' |
| `mrr` | numeric(14,2) |
| `arr` | numeric(14,2), auto-calculado via trigger (mrr × 12) |
| `tcv` | numeric(14,2) |
| `contract_start_date` | date |
| `contract_end_date` | date, CHECK: >= start_date |
| `is_expansion` | boolean default false |
| `is_renewal` | boolean default false |
| `is_churn` | boolean default false |
| Trigger | `sales_validate_revenue_fields`: recurring+won exige mrr > 0, arr auto-calc |
| `sales_revenue_events` | Nova tabela com deny-all RLS |

---

## 2. Edge Functions Criadas

| Função | Método | Operação |
|--------|--------|----------|
| `sales-opportunity-mark-won` | POST | Marca won, valida financeiros, cria revenue event |
| `sales-opportunity-mark-lost` | POST | Marca lost com motivo, cria churn event se aplicável |
| `sales-revenue-summary` | GET | MRR/ARR/TCV totais, new/expansion/churn por mês, por owner |
| `sales-revenue-events-list` | GET | Lista eventos de receita filtráveis |

### Alteradas

| Função | Mudança |
|--------|---------|
| `sales-opportunities` | Aceita campos de revenue no upsert |

---

## 3. Regras de Negócio

- ✅ WON cria revenue event automático (new/expansion/renewal)
- ✅ Churn cria evento com MRR negativo
- ✅ recurring + won exige mrr > 0
- ✅ ARR = MRR × 12 automático
- ✅ one_time zera mrr/arr
- ✅ contract_start_date <= contract_end_date
- ✅ Unique constraint previne eventos duplicados
- ✅ Ownership check em todas as operações

---

## 4. Frontend

| Arquivo | Mudança |
|---------|---------|
| `DashboardPage.tsx` | Tabs Pipeline/Receita, KPIs de MRR/ARR/TCV/net new |
| `OpportunitiesPage.tsx` | Campos de revenue no formulário, flags expansion/renewal/churn |
| `OpportunityDetailPage.tsx` | Botões Ganhar/Perder dedicados, lista de revenue events |
| `salesService.ts` | markWon, markLost, fetchRevenueSummary, fetchRevenueEvents |
| `useSalesData.ts` | useMarkWon, useMarkLost, useRevenueSummary, useRevenueEvents |

---

## 5. Checklist de Teste

- [ ] Executar `SALES_PHASE5_REVENUE_ENGINE.sql` no projeto comercial
- [ ] Criar oportunidade recorrente com MRR → ARR calculado automaticamente
- [ ] Marcar como WON → revenue event criado
- [ ] Expansion + WON → event_type = expansion
- [ ] Churn + lost → event churn com MRR negativo
- [ ] Dashboard aba Receita mostra MRR/ARR/TCV reais
- [ ] Revenue by month mostra new/expansion/churn
- [ ] Vendedor vê só seus números
- [ ] Gerente vê todos
- [ ] Não permite WON recurring sem MRR
