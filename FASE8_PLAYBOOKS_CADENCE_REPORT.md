# FASE 8 — Playbooks Comerciais, Cadência e Automação

## Status: ✅ Implementado

## Entregáveis

### SQL Schema (`SALES_PHASE8_PLAYBOOKS_CADENCE.sql`)
- `sales_templates` — templates de comunicação (email, whatsapp, sms) com variáveis
- `sales_playbooks` — playbooks comerciais por segmento
- `sales_playbook_steps` — etapas sequenciais com delay e tipo
- `sales_playbook_executions` — instâncias de execução com status e agendamento
- `sales_followup_rules` — regras de follow-up automático por dias sem atualização
- `sales_sla_rules` — regras de SLA por etapa do pipeline com escalação
- `sales_alerts` — alertas inteligentes para vendedores e gerentes
- Extensão de `sales_activities` com `execution_id`, `step_id`, `auto_generated`
- Todas com RLS deny-all

### Edge Functions (11 novas)
| Função | Tipo | Descrição |
|---|---|---|
| `sales-playbooks` | CRUD | Gerenciar playbooks |
| `sales-playbook-steps` | CRUD | Gerenciar etapas (batch upsert) |
| `sales-templates` | CRUD | Gerenciar templates |
| `sales-playbook-executions` | CRUD | Iniciar/pausar/cancelar execuções |
| `sales-playbook-engine` | Engine | Processa execuções pendentes, cria atividades |
| `sales-followup-engine` | Engine | Detecta oportunidades paradas, cria follow-ups |
| `sales-sla-engine` | Engine | Detecta violações de SLA, escala para gerente |
| `sales-alerts` | CRUD | Listar/marcar alertas como lidos |
| `sales-followup-rules` | CRUD | Gerenciar regras de follow-up |
| `sales-sla-rules` | CRUD | Gerenciar regras de SLA |

### Frontend (3 páginas + sidebar)
- **PlaybooksPage** — CRUD de playbooks com editor de etapas inline
- **TemplatesPage** — CRUD de templates com variáveis visuais
- **AlertsPage** — Feed de alertas com filtro de não lidos
- Sidebar atualizado com seção "Cadência"

## Checklist de Governança

✔ Playbook não inicia sem owner  
✔ Steps seguem ordem sequencial com delay  
✔ Atividades criadas automaticamente pelo engine  
✔ Follow-up automático para oportunidades paradas  
✔ SLA gera alerta ao vendedor e escala ao gerente  
✔ Vendedor visualiza apenas seus alertas  
✔ Admin vê todos os alertas  
✔ Histórico de execução preservado  
✔ Sem impacto em comissão ou revenue engine  
✔ Toda mediação via Edge Functions com service_role  

## Engines (execução programada)

Os três engines podem ser configurados via `pg_cron` no projeto comercial:
- `sales-playbook-engine` — recomendado a cada 5 minutos
- `sales-followup-engine` — recomendado a cada 1 hora
- `sales-sla-engine` — recomendado a cada 30 minutos
