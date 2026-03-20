# Playbooks Comerciais

## Conceito

Playbooks são sequências automatizadas de ações comerciais que garantem cadência e disciplina no processo de vendas.

## Estrutura

```
Playbook
  └── Steps (ordenados por step_order)
        ├── Email (usa template)
        ├── Ligação
        ├── WhatsApp (usa template)
        └── Tarefa manual
```

## Ciclo de Vida

1. **Criação** — admin/gerente define playbook com steps
2. **Atribuição** — playbook é vinculado a uma oportunidade
3. **Execução** — engine processa steps na ordem com delays
4. **Conclusão** — todos os steps executados ou playbook pausado

## Status de Execução

| Status | Descrição |
|--------|-----------|
| `active` | Em execução, engine processa |
| `paused` | Pausado pelo vendedor |
| `completed` | Todos os steps concluídos |
| `failed` | Erro na execução |

## Regras de Negócio

- Um playbook ativo por oportunidade (índice parcial único)
- `opportunity_id` obrigatório (NOT NULL)
- Owner herdado da oportunidade
- Template snapshot no momento da execução
- Delay em horas (`delay_hours`) e dias (`delay_days`)
- Prioridade de execução (`priority DESC, next_execution_at ASC`)

## Engine de Execução

A Edge Function `sales-playbook-engine` processa execuções pendentes:

```
1. Buscar execuções: next_execution_at <= now() AND status = 'active'
2. Para cada execução:
   a. Buscar step atual
   b. Criar atividade correspondente
   c. Incrementar current_step
   d. Calcular next_execution_at baseado no delay do próximo step
   e. Se último step → marcar completed
3. Atualizar last_execution_at (trava contra corrida)
```

## Templates

Suportam variáveis dinâmicas:
- `{{name}}` — nome do contato
- `{{company}}` — nome da empresa
- `{{segment}}` — segmento
- `{{pain}}` — dor identificada

## Exemplos de Playbook

| Playbook | Segmento | Steps |
|----------|----------|-------|
| Outbound Infra Cloud | SaaS/Cloud | Email → Call (D+2) → WhatsApp (D+5) → Call (D+7) |
| Reativação Base | Inativo | Email → Email (D+3) → Call (D+7) → Task (D+10) |
| Migração AWS → OPEN | Enterprise | Call → Email (D+1) → Meeting (D+3) → Proposal (D+5) |
