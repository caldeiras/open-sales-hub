# FASE 1B — Plano de Migração: sales_* → Projeto Comercial do CORE

**Data**: 2026-03-20  
**Status**: Scripts gerados, proxy implementado

---

## 1. Mudança Arquitetural

### Antes (errado)
```
Frontend → localClient (Lovable Cloud) → sales_* tables locais
```

### Depois (correto)
```
Frontend → salesService → Edge Function (sales-commercial-proxy)
                              ↓ valida JWT do Identity
                              ↓ usa service_role_key do Commercial
                        CORE Commercial (zkjrcenhemnnlmjiysbc) → sales_* tables
```

---

## 2. Ação Manual Necessária

### Passo 1: Executar migração no projeto comercial
Execute o arquivo `SALES_COMMERCIAL_MIGRATION.sql` no **SQL Editor do dashboard do projeto comercial** (`zkjrcenhemnnlmjiysbc`).

Esse script cria:
- `sales_pipeline_stages` (7 seeds)
- `sales_lead_sources` (7 seeds)
- `sales_segments` (5 seeds)
- `sales_loss_reasons` (7 seeds)

Com RLS habilitado:
- SELECT público (anon key pode ler)
- INSERT/UPDATE/DELETE bloqueado para anon (somente via service_role_key)

---

## 3. Arquivos Alterados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/services/salesService.ts` | **Reescrito** | Agora usa Edge Function proxy em vez de localClient |
| `supabase/functions/sales-commercial-proxy/index.ts` | **Criado** | Proxy CRUD para projeto comercial |
| `src/lib/commercialClient.ts` | **Removido** | Substituído pelo proxy |
| `/mnt/documents/SALES_COMMERCIAL_MIGRATION.sql` | **Criado** | SQL para executar no dashboard do comercial |

---

## 4. Mapa de Clients — Estado Final

| Client/Mecanismo | Projeto | Uso |
|------------------|---------|-----|
| `identityClient` | macmkfoknhofnwhizsqc | Auth, profiles, roles, RBAC |
| `sales-commercial-proxy` (Edge Function) | zkjrcenhemnnlmjiysbc | Todas operações sales_* |
| `localClient` (Lovable Cloud) | mbcakyjmeypjtzhcwqrx | Apenas para invocar Edge Functions |

---

## 5. Fluxo de Segurança

```
1. Frontend obtém JWT do Identity (macmkfoknhofnwhizsqc)
2. salesService envia request para Edge Function com Bearer token
3. Edge Function valida JWT contra Identity project
4. Edge Function usa COMMERCIAL_SERVICE_ROLE_KEY para operar no Commercial
5. RLS do Commercial permite SELECT para anon, bloqueia writes para anon
6. Service role key bypassa RLS para writes (INSERT/UPDATE/DELETE)
```

---

## 6. Secrets Necessários

| Secret | Status | Usado por |
|--------|--------|-----------|
| `IDENTITY_SUPABASE_URL` | ✅ Configurado | core-config, sales-commercial-proxy |
| `IDENTITY_SUPABASE_ANON_KEY` | ✅ Configurado | core-config, sales-commercial-proxy |
| `COMMERCIAL_SUPABASE_URL` | ✅ Configurado | core-config, sales-commercial-proxy |
| `COMMERCIAL_SUPABASE_ANON_KEY` | ✅ Configurado | core-config, sales-commercial-proxy |
| `COMMERCIAL_SERVICE_ROLE_KEY` | ✅ Configurado | sales-commercial-proxy (writes) |

---

## 7. Recomendação para Fase 2

✅ **A Fase 2 pode iniciar** após executar o SQL de migração no projeto comercial.

Próximos passos:
1. Executar `SALES_COMMERCIAL_MIGRATION.sql` no dashboard do comercial
2. Testar login + leitura de pipeline_stages para confirmar o fluxo
3. Criar tabelas transacionais no comercial: `sales_accounts`, `sales_contacts`, `sales_opportunities`, `sales_activities`
4. Implementar CRUD completo nos módulos de UI

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Service role key do comercial como secret | Key protegida no servidor, nunca exposta ao frontend |
| Latência extra por Edge Function | Aceitável para operação B2B; pode cachear config tables |
| Tabelas locais órfãs | Podem ser removidas do Lovable Cloud após confirmar migração |
