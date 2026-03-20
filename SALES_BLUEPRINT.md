# SALES OPEN — Blueprint Técnico Revisado

## Arquitetura Dual-Project do CORE

O CORE opera com **dois projetos Supabase distintos**:

| Projeto | Ref | Responsabilidade |
|---------|-----|-----------------|
| **Identity** | `macmkfoknhofnwhizsqc` | Auth, profiles, user_roles, roles, RBAC, módulos internos |
| **Commercial** | `zkjrcenhemnnlmjiysbc` | Propostas, contratos, pricing, domínio comercial |

## Mapeamento de Clients no SALES OPEN

| Client | Arquivo | Projeto alvo | Uso |
|--------|---------|-------------|-----|
| `identityClient` | `src/lib/identityClient.ts` | macmkfoknhofnwhizsqc | signIn, signOut, getSession, getUser, profiles, user_roles, roles |
| `commercialClient` | `src/lib/commercialClient.ts` | zkjrcenhemnnlmjiysbc | Leitura de propostas/contratos/pricing do CORE (futuro) |
| `supabase` (local) | `src/integrations/supabase/client.ts` | mbcakyjmeypjtzhcwqrx | Tabelas sales_* próprias do SALES OPEN |

## Fluxo de Autenticação

```
LoginPage → getIdentityClient() → signInWithPassword()
                                        ↓
                                macmkfoknhofnwhizsqc/auth/v1/token
                                        ↓
SalesAuthContext ← onAuthStateChange (identityClient)
                 ← profiles (identityClient)
                 ← user_roles + roles (identityClient)
```

## Secrets Configurados

| Secret | Projeto |
|--------|---------|
| `CORE_SUPABASE_URL` | Identity (macmkfoknhofnwhizsqc) |
| `CORE_SUPABASE_ANON_KEY` | Identity (macmkfoknhofnwhizsqc) |
| `COMMERCIAL_SUPABASE_URL` | Commercial (zkjrcenhemnnlmjiysbc) |
| `COMMERCIAL_SUPABASE_ANON_KEY` | Commercial (zkjrcenhemnnlmjiysbc) |

## Arquivos Alterados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/coreClient.ts` | **Removido** | Substituído pelos dois clients explícitos |
| `src/lib/identityClient.ts` | **Criado** | Client para auth + RBAC no projeto Identity |
| `src/lib/commercialClient.ts` | **Criado** | Client para dados comerciais do CORE |
| `supabase/functions/core-config/index.ts` | **Atualizado** | Retorna configs de ambos os projetos |
| `src/contexts/SalesAuthContext.tsx` | **Atualizado** | Usa identityClient em vez de coreClient |
| `src/pages/LoginPage.tsx` | **Atualizado** | Usa identityClient, removido sign-up |
| `src/services/salesService.ts` | **Atualizado** | Documentação explícita do client local |

## ⚠️ Riscos e Limitações

### Cross-Project JWT
O JWT emitido pelo projeto Identity (`macmkfoknhofnwhizsqc`) **NÃO é válido** no projeto Commercial (`zkjrcenhemnnlmjiysbc`). Operações autenticadas no projeto comercial devem:
- Usar Edge Functions como proxy (com service role key do comercial)
- OU usar a anon key do comercial apenas para leitura pública (se RLS permitir)

### commercialClient é read-only por padrão
Sem JWT válido no projeto comercial, só operações permitidas pela anon key (SELECT público) funcionarão. Writes exigem backend intermediário.

## Recomendação para Fase 1B

1. **Criar tabelas CRM no banco local** (sales_accounts, sales_contacts, sales_opportunities, sales_activities) — usando o client local
2. **Implementar CRUD completo** para as entidades CRM com RLS por `owner_user_id`
3. **Consumir dados comerciais do CORE via Edge Function** quando necessário (proxy seguro)
4. **NÃO duplicar** propostas/contratos no banco local — ler do comercial via proxy
