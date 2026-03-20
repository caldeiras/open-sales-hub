# Runbooks Operacionais

## 1. Transferência de Conta

**Quando usar**: vendedor sai do time ou reorganização de carteira.

**Passos**:
1. Acessar `/portfolio`
2. Selecionar conta a transferir
3. Clicar "Transferir"
4. Informar novo owner e motivo (obrigatório)
5. Sistema registra: `transferred_from`, `transferred_at`, `transfer_reason`
6. Owner anterior é desativado (`active = false`)
7. Novo owner é criado como ativo

**Validações**:
- Apenas admin/gerente pode transferir
- Motivo é obrigatório
- Histórico é preservado (nunca deletar)

---

## 2. Criação de Time

1. Acessar `/teams`
2. Clicar "Novo Time"
3. Informar nome, descrição e gerente
4. Adicionar membros com role (`sales_rep`, `sdr`, `cs`, `manager`)
5. Gerente é automaticamente membro com role `manager`

---

## 3. Atribuição de Território

1. Acessar `/territories`
2. Criar ou selecionar território
3. Atribuir vendedor com prioridade
4. Vendedor só pode criar contas dentro dos seus territórios
5. Admin pode sobrepor restrição de território

---

## 4. Execução de Playbook

1. Acessar oportunidade
2. Selecionar playbook compatível
3. Sistema cria execução com `status = active`
4. Engine processa steps automaticamente
5. Vendedor pode pausar/retomar
6. Atividades aparecem no dashboard do vendedor

---

## 5. Sync de Comissões

1. Acessar `/commissions`
2. Clicar "Sincronizar"
3. Sistema chama `sales-sync-commissions-from-core`
4. Comissões são importadas do CORE
5. SALES não calcula comissão, apenas espelha

---

## 6. Recálculo de Scores

1. Chamar `sales-priority-engine` (manual ou agendado)
2. Engine recalcula scores de todas as oportunidades
3. Ranking é atualizado por vendedor
4. Recomendações são geradas por `sales-recommendation-engine`
5. Risk flags são criadas para oportunidades em risco

---

## 7. Resolução de Alerta

1. Acessar `/alerts`
2. Visualizar alertas pendentes
3. Tomar ação recomendada
4. Marcar como lido
5. Alertas de SLA violado escalam para gerente
