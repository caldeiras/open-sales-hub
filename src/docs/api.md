# API — Edge Functions

## Convenções

- Todas as Edge Functions validam JWT do Identity Project
- Método `GET` para leitura, `POST` para criação/atualização
- Header obrigatório: `Authorization: Bearer <jwt>` e `apikey: <anon_key>`
- Respostas em JSON com `{ data }` ou `{ error }`

---

## Funções de Dados

| Função | Método | Descrição |
|--------|--------|-----------|
| `sales-accounts` | GET/POST | CRUD de empresas |
| `sales-contacts` | GET/POST | CRUD de contatos |
| `sales-opportunities` | GET/POST | CRUD de oportunidades |
| `sales-leads` | GET/POST | CRUD de leads |
| `sales-activities` | GET/POST | CRUD de atividades |
| `sales-pipeline-board` | GET | Board Kanban por status |
| `sales-dashboard-summary` | GET | Resumo do dashboard |

## Funções de Pipeline

| Função | Método | Descrição |
|--------|--------|-----------|
| `sales-opportunity-move-stage` | POST | Mover oportunidade de estágio |
| `sales-opportunity-history` | GET | Histórico de movimentações |
| `sales-opportunity-mark-won` | POST | Marcar como ganha |
| `sales-opportunity-mark-lost` | POST | Marcar como perdida |
| `sales-opportunity-forecast-upsert` | POST | Atualizar forecast |
| `sales-opportunity-link-proposal` | POST | Vincular proposta |
| `sales-opportunity-scores` | GET | Scores de oportunidade |

## Funções de Estrutura

| Função | Método | Descrição |
|--------|--------|-----------|
| `sales-teams` | GET/POST | CRUD de times |
| `sales-team-members` | GET/POST | Membros do time |
| `sales-team-summary` | GET | Resumo por time |
| `sales-territories` | GET/POST | CRUD de territórios |
| `sales-territory-assignments` | GET/POST | Atribuições de território |
| `sales-account-ownership` | GET/POST | Ownership de contas |

## Funções de Cadência

| Função | Método | Descrição |
|--------|--------|-----------|
| `sales-playbooks` | GET/POST | CRUD de playbooks |
| `sales-playbook-steps` | GET/POST | Etapas do playbook |
| `sales-playbook-executions` | GET/POST | Execuções ativas |
| `sales-playbook-engine` | POST | Motor de execução |
| `sales-templates` | GET/POST | Templates de mensagem |
| `sales-followup-rules` | GET/POST | Regras de follow-up |
| `sales-followup-engine` | POST | Motor de follow-up |
| `sales-sla-rules` | GET/POST | Regras de SLA |
| `sales-sla-engine` | POST | Motor de SLA |
| `sales-alerts` | GET/POST | Alertas do sistema |

## Funções de Inteligência

| Função | Método | Descrição |
|--------|--------|-----------|
| `sales-scoring-rules` | GET/POST | Regras de scoring |
| `sales-priority-engine` | POST | Motor de prioridade |
| `sales-recommendation-engine` | POST | Motor de recomendações |
| `sales-recommendations` | GET | Recomendações ativas |
| `sales-risk-flags` | GET | Flags de risco |

## Funções de Resultado

| Função | Método | Descrição |
|--------|--------|-----------|
| `sales-goals` | GET/POST | CRUD de metas |
| `sales-goal-performance` | GET | Performance vs meta |
| `sales-commissions` | GET | Comissões (espelho CORE) |
| `sales-sync-commissions-from-core` | POST | Sync de comissões |
| `sales-ranking-summary` | GET | Ranking de vendedores |
| `sales-revenue-summary` | GET | Resumo de receita |
| `sales-revenue-events-list` | GET | Eventos de receita |
| `sales-forecast-summary` | GET | Resumo de forecast |

## Proxy

| Função | Método | Descrição |
|--------|--------|-----------|
| `sales-commercial-proxy` | POST | Acesso genérico a tabelas de config |
