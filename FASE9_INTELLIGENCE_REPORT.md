# FASE 9 — Inteligência Comercial: Scoring, Prioridade e Recomendações

## Status: ✅ Implementado

## Entregáveis

### SQL Schema (`SALES_PHASE9_INTELLIGENCE.sql`)
- `sales_lead_scores` — scoring de leads (fit + intent + engagement)
- `sales_opportunity_scores` — scoring de oportunidades (stage + value + recency + activity)
- `sales_recommendations` — recomendações de ação por vendedor
- `sales_risk_flags` — flags de risco por oportunidade
- `sales_scoring_rules` — regras configuráveis de pontuação
- Campos `priority_score` e `priority_rank` em `sales_opportunities`
- Todas com RLS deny-all

### Edge Functions (7 novas)
| Função | Tipo | Descrição |
|---|---|---|
| `sales-priority-engine` | Engine | Recalcula scores e ranking de oportunidades |
| `sales-recommendation-engine` | Engine | Gera recomendações e flags de risco |
| `sales-recommendations` | CRUD | Listar/descartar recomendações |
| `sales-risk-flags` | CRUD | Listar/resolver flags de risco |
| `sales-opportunity-scores` | CRUD | Consultar scores de oportunidades |
| `sales-scoring-rules` | CRUD | Gerenciar regras de pontuação |

### Frontend
- **PriorityPage** — painel "Hoje você deve fazer isso" + Top 10 + Riscos
- **Service**: `salesIntelligenceService.ts`
- **Hook**: `useIntelligenceData.ts`
- Sidebar com item "Inteligência" na seção Cadência

## Regras de Scoring

### Opportunity Score (0-100)
- **Stage Weight** (max 30): posição relativa no pipeline
- **Value Weight** (max 30): log10 do valor (MRR/amount)
- **Recency Weight** (max 20): decai 1pt/dia desde última atualização
- **Activity Weight** (max 20): 4pts por atividade nos últimos 30 dias

### Recomendações
- Score > 50 + sem atividade 7d → "Follow-up urgente"
- Estágio avançado + valor alto → "Ligar agora"
- Estágio avançado + sem proposta → "Enviar proposta"

### Riscos
- Sem atividade > 14 dias → risco médio
- Parada no estágio > 21 dias → risco alto

## Engines (execução programada)
- `sales-priority-engine` — recomendado diariamente
- `sales-recommendation-engine` — recomendado a cada 6 horas
