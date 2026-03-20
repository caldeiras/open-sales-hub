# FASE 3 — SALES OPEN: Motor do Pipeline

**Data**: 2026-03-20  
**Status**: Implementação completa, aguardando execução do SQL no comercial

---

## 1. SQL de Migração

Arquivo: `/mnt/documents/SALES_PHASE3_PIPELINE_ENGINE.sql`

| Tabela | Campos-chave | Índices |
|--------|-------------|---------|
| `sales_opportunity_stage_history` | opportunity_id, from_stage_id, to_stage_id, changed_by_user_id, changed_at, notes | opportunity_id, to_stage_id, changed_by_user_id, changed_at DESC |

RLS: `USING (false) WITH CHECK (false)` — acesso somente via service_role.

---

## 2. Edge Functions Criadas

| Função | Método | Operação |
|--------|--------|----------|
| `sales-opportunity-move-stage` | POST | Move estágio + grava histórico + regras de negócio |
| `sales-opportunity-history` | GET | Lista histórico de mudanças de estágio |
| `sales-dashboard-summary` | GET | KPIs agregados por owner |
| `sales-pipeline-board` | GET | Kanban: estágios + oportunidades agrupadas |

---

## 3. Regras de Negócio Implementadas

- ✅ Movimentação atualiza `pipeline_stage_id` + grava `sales_opportunity_stage_history`
- ✅ Oportunidade won/lost não pode ser movida (deve reabrir primeiro)
- ✅ Marcar como lost exige `loss_reason_id`
- ✅ Marcar como won permite registrar amount/monthly_value final
- ✅ Validação de estágio ativo antes de mover
- ✅ Não permite mover para o mesmo estágio

---

## 4. Matriz de Autorização (mantida da Fase 2)

| Role | Ver próprios | Ver todos | Mover próprios | Mover todos |
|------|-------------|-----------|----------------|-------------|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `gerente_comercial` | ✅ | ✅ | ✅ | ✅ |
| `comercial` | ✅ | ❌ | ✅ | ❌ |
| `cs/parceiro/bdr` | ❌ | ❌ | ❌ | ❌ |

---

## 5. Arquivos Criados/Alterados

### Criados
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/sales-opportunity-move-stage/index.ts` | Move estágio com regras |
| `supabase/functions/sales-opportunity-history/index.ts` | Histórico de estágios |
| `supabase/functions/sales-dashboard-summary/index.ts` | KPIs agregados |
| `supabase/functions/sales-pipeline-board/index.ts` | Kanban board data |
| `/mnt/documents/SALES_PHASE3_PIPELINE_ENGINE.sql` | SQL manual |

### Alterados
| Arquivo | Mudança |
|---------|---------|
| `src/services/salesService.ts` | Novos métodos: moveOpportunityStage, fetchStageHistory, fetchDashboardSummary, fetchPipelineBoard |
| `src/hooks/useSalesData.ts` | Novos hooks: useDashboardSummary, usePipelineBoard, useStageHistory, useMoveOpportunityStage |
| `src/pages/sales/PipelinePage.tsx` | Kanban real com ação de mover estágio |
| `src/pages/sales/DashboardPage.tsx` | Dashboard com KPIs reais via Edge Function |
| `src/pages/sales/OpportunityDetailPage.tsx` | Detalhe com histórico e ação de mover |

---

## 6. Checklist de Teste

- [ ] Executar `SALES_PHASE3_PIPELINE_ENGINE.sql` no projeto comercial
- [ ] Login com `comercial` → ver apenas oportunidades próprias no kanban
- [ ] Login com `gerente_comercial` → ver todas as oportunidades
- [ ] Mover oportunidade de estágio → confirmar que persiste e grava histórico
- [ ] Tentar mover oportunidade won/lost → deve ser bloqueado
- [ ] Marcar como lost sem motivo → deve ser bloqueado
- [ ] Marcar como won com valores finais → deve persistir
- [ ] Dashboard mostra KPIs corretos por owner
- [ ] Dashboard gerencial mostra visão total
- [ ] Histórico de estágios aparece no detalhe da oportunidade
