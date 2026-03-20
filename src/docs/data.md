# Data Model

## Tabelas no Projeto Comercial (CORE)

Estas tabelas vivem no banco comercial e são acessadas via Edge Functions com `COMMERCIAL_SERVICE_ROLE_KEY`.

### Entidades Principais

| Tabela | Descrição | Owner |
|--------|-----------|-------|
| `sales_accounts` | Empresas/contas | `owner_user_id` |
| `sales_contacts` | Contatos de empresas | via account |
| `sales_opportunities` | Oportunidades de venda | `owner_user_id` |
| `sales_leads` | Leads em prospecção | `owner_user_id` |
| `sales_activities` | Atividades e interações | `owner_user_id` |

### Pipeline e Revenue

| Tabela | Descrição |
|--------|-----------|
| `sales_pipeline_stages` | Estágios do funil |
| `sales_opportunity_history` | Histórico de movimentações |
| `sales_opportunity_forecasts` | Previsões por oportunidade |
| `sales_revenue_events` | Eventos de receita (won/lost) |

### Estrutura Organizacional

| Tabela | Descrição |
|--------|-----------|
| `sales_teams` | Times comerciais |
| `sales_team_members` | Membros dos times |
| `sales_territories` | Territórios de atuação |
| `sales_territory_assignments` | Atribuições de território |
| `sales_account_ownership` | Ownership de contas |
| `sales_account_collaborators` | Colaboradores (futuro) |

### Cadência e Automação

| Tabela | Descrição |
|--------|-----------|
| `sales_playbooks` | Playbooks comerciais |
| `sales_playbook_steps` | Etapas dos playbooks |
| `sales_playbook_executions` | Execuções ativas |
| `sales_templates` | Templates de mensagem |
| `sales_followup_rules` | Regras de follow-up |
| `sales_sla_rules` | Regras de SLA |
| `sales_alerts` | Alertas do sistema |

### Inteligência

| Tabela | Descrição |
|--------|-----------|
| `sales_lead_scores` | Scores de leads |
| `sales_opportunity_scores` | Scores de oportunidades |
| `sales_scoring_rules` | Regras de scoring |
| `sales_recommendations` | Recomendações de ação |
| `sales_risk_flags` | Flags de risco |

### Resultados

| Tabela | Descrição |
|--------|-----------|
| `sales_goals` | Metas por período |
| `sales_commissions` | Comissões (espelho CORE) |

---

## Tabelas Locais (SALES Project)

Tabelas de configuração com RLS deny-all:

| Tabela | Descrição |
|--------|-----------|
| `sales_pipeline_stages` | Config de estágios |
| `sales_lead_sources` | Origens de lead |
| `sales_segments` | Segmentos de mercado |
| `sales_loss_reasons` | Motivos de perda |

---

## Regras de Integridade

1. **Ownership**: toda conta e oportunidade deve ter `owner_user_id`
2. **Unique active owner**: `UNIQUE(account_id) WHERE active = true` em `sales_account_ownership`
3. **Deduplicação**: índices parciais impedem duplicatas ativas em recommendations e risk_flags
4. **Foreign Keys**: `opportunity_id` referencia `sales_opportunities(id)` em scores, risk_flags e recommendations
5. **Cascade**: `ON DELETE CASCADE` em membros de time e atribuições de território
