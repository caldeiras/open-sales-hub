# RBAC — Controle de Acesso

## Origem das Roles

As roles são definidas no **Identity Project (CORE)** e propagadas via JWT. O SALES não gerencia roles diretamente.

## Roles do Sistema

| Role | Descrição | Escopo de Dados |
|------|-----------|----------------|
| `admin` | Administrador geral | Vê tudo, gerencia tudo |
| `gerente_comercial` | Gerente de time | Vê dados do seu time |
| `comercial` | Vendedor | Vê apenas seus dados |

## Matriz de Permissões

| Ação | admin | gerente_comercial | comercial |
|------|-------|-------------------|-----------|
| Ver todas as contas | ✅ | ❌ (só time) | ❌ (só suas) |
| Criar conta | ✅ | ✅ | ✅ (no território) |
| Transferir conta | ✅ | ✅ (no time) | ❌ |
| Gerenciar times | ✅ | ✅ (seu time) | ❌ |
| Gerenciar territórios | ✅ | ❌ | ❌ |
| Ver comissões | ✅ | ✅ (time) | ✅ (suas) |
| Definir metas | ✅ | ✅ | ❌ |
| Configurações | ✅ | ✅ | ❌ |
| Criar playbook | ✅ | ✅ | ❌ |
| Executar playbook | ✅ | ✅ | ✅ |

## Fluxo de Validação

```
Request chega na Edge Function
  → Extrair JWT do header Authorization
  → Validar JWT contra Identity Project (JWKS)
  → Extrair user_id e roles do payload
  → Aplicar filtro de ownership:
      - admin: sem filtro
      - gerente: filtrar por team_members.user_id IN team
      - comercial: filtrar por owner_user_id = auth.userId
  → Retornar dados filtrados
```

## Implementação nas Edge Functions

```typescript
// _shared/sales-auth.ts
async function applyOwnershipFilter(query, auth) {
  if (auth.isAdmin) return query; // sem filtro
  if (auth.isManager) {
    // buscar user_ids do time
    return query.in('owner_user_id', teamUserIds);
  }
  return query.eq('owner_user_id', auth.userId);
}
```

## Regras de Território

- Vendedor só cria conta/oportunidade dentro do seu território
- Gerente pode sobrepor restrição
- Admin ignora restrição
- Validado em `sales-accounts` e `sales-opportunities` (POST)

## Frontend

O componente `PermissionGate` controla visibilidade:

```tsx
<PermissionGate roles={['admin', 'gerente_comercial']}>
  <Button>Transferir Conta</Button>
</PermissionGate>
```
