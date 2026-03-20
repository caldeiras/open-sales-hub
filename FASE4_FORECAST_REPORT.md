# FASE 4 — SALES OPEN: Forecast & Proposta

**Data**: 2026-03-20  
**Status**: Implementação completa, aguardando execução do SQL no comercial

---

## 1. SQL de Migração

Arquivo: `/mnt/documents/SALES_PHASE4_FORECAST.sql`

| Alteração | Detalhes |
|-----------|---------|
| `probability_percent` | numeric(5,2), CHECK 0-100 |
| `expected_close_month` | date (primeiro dia do mês) |
| `weighted_amount` | numeric(14,2), calculado via Edge Function (amount × probability / 100) |
| `proposal_id` | uuid null |
| `proposal_external_id` | text null |
| `proposal_number` | text null |
| Índices | expected_close_month, probability_percent, proposal_id, proposal_external_id |

---

## 2. Edge Functions Criadas

| Função | Método | Operação |
|--------|--------|----------|
| `sales-opportunity-forecast-upsert` | POST | Atualiza probability + expected_close_month + calcula weighted_amount |
| `sales-opportunity-link-proposal` | POST | Vincula proposta por id/external_id/number |
| `sales-forecast-summary` | GET | Forecast completo: bruto, ponderado, por mês, por estágio, por owner |

### Alteradas

| Função | Mudança |
|--------|---------|
| `sales-opportunities` | POST agora aceita probability_percent, expected_close_month, proposal_*, auto-calcula weighted_amount |
| `sales-opportunity-move-stage` | Won → probability=100, Lost → probability=0 + weighted recalculado |

---

## 3. Regras de Negócio

- ✅ Won → probability_percent = 100 automático
- ✅ Lost → probability_percent = 0 automático + loss_reason_id obrigatório
- ✅ weighted_amount = amount × probability_percent / 100
- ✅ expected_close_month normalizado para primeiro dia do mês
- ✅ Probabilidade validada entre 0 e 100
- ✅ Proposta vinculada por número ou ID externo (sem acoplamento)

---

## 4. Arquivos Criados/Alterados

### Criados
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/sales-opportunity-forecast-upsert/index.ts` | Upsert forecast |
| `supabase/functions/sales-opportunity-link-proposal/index.ts` | Vínculo de proposta |
| `supabase/functions/sales-forecast-summary/index.ts` | Summary com pipeline ponderado |
| `/mnt/documents/SALES_PHASE4_FORECAST.sql` | SQL para execução manual |

### Alterados
| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/sales-opportunities/index.ts` | Campos de forecast e proposta no upsert |
| `supabase/functions/sales-opportunity-move-stage/index.ts` | Auto-set probability on won/lost |
| `src/services/salesService.ts` | upsertForecast, linkProposal, fetchForecastSummary |
| `src/hooks/useSalesData.ts` | useForecastSummary, useUpsertForecast, useLinkProposal |
| `src/pages/sales/OpportunitiesPage.tsx` | Colunas prob/ponderado + campos no form |
| `src/pages/sales/OpportunityDetailPage.tsx` | Dialogs de forecast e proposta + dados na view |
| `src/pages/sales/DashboardPage.tsx` | Pipeline ponderado, previsão por mês, por owner |

---

## 5. Checklist de Teste

- [ ] Executar `SALES_PHASE4_FORECAST.sql` no projeto comercial
- [ ] Criar oportunidade com probabilidade → weighted_amount calculado
- [ ] Editar probabilidade via dialog Forecast → valor ponderado atualiza
- [ ] Marcar como won → probabilidade vira 100 automaticamente
- [ ] Marcar como lost → probabilidade vira 0 + motivo obrigatório
- [ ] Vincular proposta por número → aparece no detalhe
- [ ] Dashboard mostra pipeline bruto vs ponderado
- [ ] Dashboard mostra previsão por mês
- [ ] Dashboard gerencial mostra por owner
- [ ] Comercial altera forecast só das próprias oportunidades
- [ ] Gerente vê todos os dados no forecast summary
