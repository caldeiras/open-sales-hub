# Módulos do SALES OPEN

## Mapa de Módulos

O SALES OPEN é dividido em 5 grupos funcionais com 19 módulos.

---

## 1. Execução Comercial

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Dashboard | `/` | Visão geral com KPIs, pipeline e alertas |
| Leads | `/leads` | Gestão de leads com scoring e temperatura |
| Empresas | `/accounts` | Cadastro de contas com ownership |
| Contatos | `/contacts` | Contatos vinculados a empresas |
| Oportunidades | `/opportunities` | Gestão completa do ciclo de vendas |
| Pipeline | `/pipeline` | Visualização Kanban das oportunidades |
| Atividades | `/activities` | Registro de interações e follow-ups |
| Propostas | `/proposals` | Vinculação de propostas a oportunidades |

## 2. Cadência e Automação

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Playbooks | `/playbooks` | Sequências de ações comerciais |
| Templates | `/templates` | Modelos de email e WhatsApp |
| Alertas | `/alerts` | Notificações de SLA, risco e follow-up |
| Inteligência | `/priority` | Scoring, priorização e recomendações |

## 3. Resultados

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Metas | `/goals` | Definição e acompanhamento de metas |
| Comissão | `/commissions` | Espelho de comissões do CORE |
| Relatórios | `/reports` | Dashboards analíticos |

## 4. Estrutura Organizacional

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Times | `/teams` | Gestão de equipes comerciais |
| Territórios | `/territories` | Regiões e segmentos de atuação |
| Carteira | `/portfolio` | Distribuição de contas por vendedor |

## 5. Administração

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Configurações | `/settings` | Parâmetros do sistema |

---

## Dependências entre Módulos

```
Leads → Oportunidades → Pipeline → Forecast → Revenue
                      ↓
                 Atividades → Playbooks
                      ↓
                 Propostas
```
