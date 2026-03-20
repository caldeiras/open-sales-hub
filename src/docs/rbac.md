# RBAC — Controle de Acesso

## Visão Geral

O RBAC do SALES OPEN é baseado em **tabelas canônicas locais** (roles, permissions, role\_permissions, user\_roles) acessadas via **Edge Functions** com RLS deny-all. A autenticação continua via Identity (CORE), mas a resolução de papéis e permissões é feita no banco local.

## Arquitetura

```
Frontend (SalesAuthContext)
  → chama sales-rbac (action: my-context)
  → Edge Function valida JWT via Identity
  → consulta tabelas locais via RPCs SECURITY DEFINER
  → retorna roles[] + permissions[]

Edge Functions (sales-leads, sales-accounts, etc.)
  → validateIdentityJwt() valida JWT
  → resolveRoles() consulta tabelas locais
  → aplica ownership filter baseado em role
```

## Origem das Roles

As roles são definidas nas **tabelas locais do projeto SALES** e gerenciadas via tela administrativa `/rbac`. O Identity (CORE) é usado apenas para autenticação (login/sessão).

## Roles do Sistema

| Role | Label | Escopo | Descrição |
|------|-------|--------|-----------|
| `admin` | Administrador | Global | Vê tudo, gerencia tudo |
| `gerente_comercial` | Gerente Comercial | Sales | Vê dados do seu time |
| `comercial` | Comercial | Sales | Vê apenas seus dados |
| `parceiro` | Parceiro | Sales | Acesso limitado |
| `cliente` | Cliente | — | Acesso de cliente |
| `rh` | RH | HR | Recursos Humanos |
| `cs` | Customer Success | CS | Sucesso do cliente |
| `suporte` | Suporte | Support | Atendimento |
| `gerente_suporte` | Gerente de Suporte | Support | Gestão de suporte |

## Permissões

| Chave | Módulo | Descrição |
|-------|--------|-----------|
| `sales.access` | sales | Acesso ao módulo de vendas |
| `lead.view` | leads | Visualizar leads |
| `lead.create` | leads | Criar leads |
| `lead.update` | leads | Editar leads |
| `lead.delete` | leads | Excluir leads |
| `lead.assign` | leads | Atribuir leads |
| `company.view` | accounts | Visualizar empresas |
| `company.create` | accounts | Criar empresas |
| `contact.view` | contacts | Visualizar contatos |
| `contact.create` | contacts | Criar contatos |
| `opportunity.view` | opportunities | Visualizar oportunidades |
| `opportunity.create` | opportunities | Criar oportunidades |
| `opportunity.update` | opportunities | Editar oportunidades |
| `pipeline.view` | pipeline | Visualizar pipeline |
| `activity.view` | activities | Visualizar atividades |
| `activity.create` | activities | Criar atividades |
| `proposal.view` | proposals | Visualizar propostas |
| `proposal.create` | proposals | Criar propostas |
| `proposal.update` | proposals | Editar propostas |
| `proposal.send` | proposals | Enviar propostas |
| `proposal.approve` | proposals | Aprovar propostas |
| `goal.view` | goals | Visualizar metas |
| `commission.view` | commissions | Visualizar comissões |
| `commission.manage` | commissions | Gerenciar comissões |
| `reports.view` | reports | Visualizar relatórios |
| `rbac.view` | admin | Visualizar RBAC |
| `rbac.manage` | admin | Gerenciar RBAC |

## Matriz de Permissões por Papel

| Permissão | admin | gerente\_comercial | comercial | parceiro | cs |
|-----------|-------|--------------------|-----------|----------|-----|
| sales.access | ✅ | ✅ | ✅ | ✅ | ✅ |
| lead.* | ✅ | ✅ | view/create/update | view/create | — |
| company.* | ✅ | ✅ | view/create | view | view |
| opportunity.* | ✅ | ✅ | view/create/update | view | view |
| pipeline.view | ✅ | ✅ | ✅ | ✅ | ✅ |
| activity.* | ✅ | ✅ | view/create | — | view/create |
| proposal.* | ✅ | ✅ (incl. approve) | view/create/update/send | — | — |
| rbac.manage | ✅ | — | — | — | — |

## RPCs Disponíveis

| Função | Tipo | Descrição |
|--------|------|-----------|
| `rbac_get_user_roles(p_user_id)` | SECURITY DEFINER | Retorna array de nomes de roles ativas |
| `rbac_get_user_permissions(p_user_id)` | SECURITY DEFINER | Retorna array de chaves de permissões |
| `rbac_user_has_role(p_user_id, p_role)` | SECURITY DEFINER | Verifica se tem role específica |
| `rbac_user_has_permission(p_user_id, p_permission)` | SECURITY DEFINER | Verifica permissão (admin passa sempre) |
| `rbac_assign_role(p_actor, p_target, p_role)` | SECURITY DEFINER | Atribui role (só admin) + audit log |
| `rbac_remove_role(p_actor, p_target, p_role)` | SECURITY DEFINER | Remove role (só admin) + audit log |

## Fluxo de Validação nas Edge Functions

```
Request chega na Edge Function
  → Extrair JWT do header Authorization
  → Validar JWT contra Identity Project (getUser)
  → Resolver roles via local RBAC (rbac_get_user_roles)
  → Resolver permissions via local RBAC (rbac_get_user_permissions)
  → Aplicar filtro de ownership:
      - admin: sem filtro
      - gerente: filtrar por team_members
      - comercial: filtrar por owner_user_id = auth.userId
  → Retornar dados filtrados
```

## Frontend — PermissionGate

```tsx
// Por permissão (recomendado)
<PermissionGate permissionKey="lead.create">
  <Button>Novo Lead</Button>
</PermissionGate>

// Por papel
<PermissionGate allowedRoles={['admin', 'gerente_comercial']}>
  <Button>Transferir Conta</Button>
</PermissionGate>
```

## Auditoria

Todos os eventos de atribuição e remoção de papéis são registrados na tabela `audit_logs`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| user\_id | uuid | Quem executou a ação |
| entity\_type | text | Tipo da entidade (ex: user\_role) |
| entity\_id | uuid | ID do alvo |
| action | text | Ação (role.assigned, role.removed) |
| description | text | Descrição legível |
| meta | jsonb | Dados adicionais (role, target\_user\_id) |

## Troubleshooting

### Erro 403 "User lacks commercial role"

1. Verificar se o usuário tem role atribuída em `/rbac`
2. Se não, admin deve atribuir `comercial`, `gerente_comercial` ou `admin`
3. Após atribuição, recarregar a página

### Usuário não aparece na lista de RBAC

O usuário precisa ter pelo menos uma role atribuída para aparecer. Use o botão "Atribuir Papel" com o UUID do usuário do Identity.

### Permissão negada para ação específica

1. Verificar qual permissão a ação requer (ver matriz acima)
2. Verificar quais permissões o papel do usuário concede
3. Se necessário, atribuir papel com permissão adequada
