# Sincronização com CORE

## Princípio

O SALES OPEN **não é a fonte de verdade** para autenticação, roles nem comissões. Esses dados vêm do CORE e são consumidos ou espelhados pelo SALES.

## Pontos de Integração

### 1. Autenticação (Identity Project)

| Aspecto | Detalhe |
|---------|---------|
| **Direção** | CORE → SALES |
| **Mecanismo** | JWT emitido pelo Identity Project |
| **Frequência** | A cada request |
| **Dados** | user_id, email, roles |
| **Cache** | Não (validação em tempo real) |

### 2. Dados Comerciais (Commercial Project)

| Aspecto | Detalhe |
|---------|---------|
| **Direção** | SALES ↔ Commercial DB |
| **Mecanismo** | Edge Functions com service_role |
| **Frequência** | A cada operação |
| **Dados** | Accounts, opportunities, activities, etc. |
| **Cache** | React Query (staleTime configurável) |

### 3. Comissões (CORE → SALES)

| Aspecto | Detalhe |
|---------|---------|
| **Direção** | CORE → SALES |
| **Mecanismo** | `sales-sync-commissions-from-core` |
| **Frequência** | Manual ou agendado |
| **Dados** | commission records por período |
| **Idempotência** | Sim (upsert por external_reference) |

O SALES **nunca calcula comissão**. Apenas importa e exibe.

### 4. Propostas (CORE → SALES)

| Aspecto | Detalhe |
|---------|---------|
| **Direção** | CORE → SALES |
| **Mecanismo** | `sales-opportunity-link-proposal` |
| **Frequência** | Por evento |
| **Dados** | proposal_id, proposal_number |

---

## Secrets Necessários

| Secret | Projeto | Uso |
|--------|---------|-----|
| `IDENTITY_PROJECT_URL` | SALES | Validar JWT |
| `IDENTITY_JWT_SECRET` | SALES | Verificar assinatura |
| `COMMERCIAL_SUPABASE_URL` | SALES | Acessar DB comercial |
| `COMMERCIAL_SERVICE_ROLE_KEY` | SALES | Operar como service_role |

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Identity offline | Frontend mostra erro de auth |
| Commercial DB lento | React Query com retry + staleTime |
| JWT expirado | Refresh automático pelo Identity client |
| Comissão desatualizada | Sync manual + timestamp de última sync |
| Dados órfãos | Foreign keys + cascade deletes |
