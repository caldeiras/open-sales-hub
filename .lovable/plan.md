

# OPEN SALES — MVP Robusto

## Visão Geral
Aplicação de execução comercial B2B da OPEN, conectada ao Supabase já existente, consumindo as tabelas `sales_*` e `rbac_*` sem criar estruturas paralelas. Oportunidade como entidade central. Interface desktop-first, rápida e objetiva.

## Fundação Técnica

### Conexão Supabase
- Conectar ao projeto Supabase já existente (mesmo do CORE)
- Configurar cliente Supabase com auth já ativa

### Camada de Autorização (Frontend)
- Hook `useSalesAuth` que obtém role e scope do usuário no app "sales" via funções `rbac_*` existentes
- Context provider `SalesAuthProvider` expondo:
  - `currentRole`, `currentScope`
  - `hasSalesPermission(key)`
  - `canRead(module, level)` — own/team/all
- Componente `<PermissionGate>` para esconder/desabilitar ações conforme permissão

### Arquitetura de Código
- `/src/hooks/` — hooks de dados e auth
- `/src/services/` — queries Supabase por módulo
- `/src/components/sales/` — componentes reutilizáveis
- `/src/pages/sales/` — páginas por módulo
- `/src/contexts/` — SalesAuthContext
- `/src/types/sales.ts` — tipos TypeScript das tabelas

## Design System
- Paleta: Navy #0F172A (sidebar), Blue #2563EB (CTAs), Emerald #10B981 (ganho), Amber #F59E0B (urgente), Background #F8FAFC
- Tipografia: Inter, 14px base, Semi-bold headers
- Sidebar fixa à esquerda com agrupamento por função

## Layout Principal
- Sidebar fixa com logo OPEN SALES e grupos:
  - **Execução**: Visão Geral, Leads, Empresas, Contatos, Oportunidades, Pipeline, Atividades, Propostas
  - **Resultados**: Metas, Comissão, Relatórios
  - **Admin**: Configurações
- Itens visíveis conforme permissão do usuário
- Header com trigger do sidebar e info do usuário

## Componentes Reutilizáveis
- `KPICard` — card de métrica com ícone, valor, variação
- `DataTable` — tabela com busca, paginação, ordenação
- `AdvancedFilters` — filtros por owner, equipe, período, segmento, origem
- `StageBadge` / `StatusBadge` — pills coloridos
- `QuickCreateDrawer` — drawer lateral para criação rápida
- `TimelineBlock` — timeline de histórico
- `ActivityBlock` — bloco de atividades vinculadas
- `ProposalBlock` — bloco de proposta vinculada
- `KanbanCard` — card do pipeline com alertas
- `OverdueAlert` — alerta de follow-up vencido
- `PermissionGate` — controle visual por RBAC

## Módulo 1 — Visão Geral (Dashboard)
- KPIs: Pipeline total, MRR potencial, TCV potencial
- Oportunidades por stage (gráfico de barras/funil)
- Propostas: enviadas, aprovadas, rejeitadas
- Atividades do dia e follow-ups vencidos
- Oportunidades sem próxima ação
- Ranking básico de vendedores
- Resumo de metas e comissão prevista
- Filtros: owner, equipe, período, segmento, origem

## Módulo 2 — Leads
- Listagem com busca, filtros (status, origem, segmento, temperatura, owner)
- Criação rápida via drawer
- Detalhe do lead com edição inline
- Notas vinculadas
- Botão "Converter para Oportunidade" (visível conforme permissão)

## Módulo 3 — Empresas
- Listagem com busca e filtros
- Detalhe: dados, contatos vinculados, oportunidades vinculadas, notas
- Owner, segmento, status, cidade/estado

## Módulo 4 — Contatos
- Listagem com busca
- Detalhe: empresa vinculada, cargo, departamento, e-mail, telefone, WhatsApp
- Nível de influência, flag principal/não principal

## Módulo 5 — Oportunidades (Centro do App)
- Listagem em tabela e cards, com filtros avançados
- Detalhe completo em página ou drawer:
  - Dados: owner, contato, source, segment, stage, status, MRR, setup, TCV, probability, expected_close_date, competitor, loss_reason, strategic_notes
  - Timeline de histórico de stages
  - Notas, atividades, proposta vinculada, produtos vinculados
- Ações conforme permissão: editar, mudar stage, reatribuir, marcar ganho/perda, hold, reabrir, criar atividade, vincular proposta
- Ações futuras (dependentes de RPC) marcadas como "em breve" com tooltip

## Módulo 6 — Pipeline (Kanban)
- Colunas dinâmicas de `sales_pipeline_stages`
- Drag-and-drop (habilitado apenas com permissão de mudança de stage)
- Cards com: nome, empresa, valor, owner, próxima atividade, alerta de atraso, proposta
- Filtros: owner, equipe, segmento, origem

## Módulo 7 — Atividades
- Listagem com tabs: pendentes, vencidas, concluídas, todas
- Agenda simples (visão por dia/semana)
- Criação rápida com vínculo a oportunidade/empresa/contato
- Tipo, prioridade, prazo, responsável
- Destaque visual para atrasadas

## Módulo 8 — Propostas
- Listagem de `sales_proposals_links`
- Detalhe: status, número, valores (monthly, setup, TCV), contract_term, datas (sent, expires, approved, rejected)
- Vínculo com oportunidade
- Ações: abrir link da proposta, vincular proposta existente (conforme permissão)

## Módulo 9 — Metas (Estrutura Inicial)
- Cards e listagem visual preparada para tabela futura
- Visão individual e por equipe
- Métricas: MRR meta, TCV meta, reuniões, propostas, novos clientes
- Realizado vs meta (com dados mock/placeholder onde tabela ainda não existe)

## Módulo 10 — Comissão (Estrutura Inicial)
- Visão de comissão prevista em cards e tabela
- Campos: oportunidade, beneficiário, base, percentual, valor previsto, status
- Estrutura visual preparada para integração posterior

## Módulo 11 — Relatórios
- Relatórios básicos com gráficos e tabelas:
  - Pipeline por vendedor e por equipe
  - Conversão por etapa (funil)
  - Oportunidades por segmento
  - Motivos de perda
  - Aging de oportunidades
  - Atividades por vendedor
  - Propostas por status
  - Metas vs realizado
  - Comissão prevista

## Módulo 12 — Configurações
- CRUD para: stages do pipeline, origens de lead, segmentos, motivos de perda, tags
- Leitura e edição conforme permissão do usuário

## Rotas
```
/                    → Dashboard (Visão Geral)
/leads               → Leads
/leads/:id           → Detalhe do Lead
/accounts            → Empresas
/accounts/:id        → Detalhe da Empresa
/contacts            → Contatos
/contacts/:id        → Detalhe do Contato
/opportunities       → Oportunidades
/opportunities/:id   → Detalhe da Oportunidade
/pipeline            → Pipeline Kanban
/activities          → Atividades
/proposals           → Propostas
/proposals/:id       → Detalhe da Proposta
/goals               → Metas
/commissions         → Comissão
/reports             → Relatórios
/settings            → Configurações
```

