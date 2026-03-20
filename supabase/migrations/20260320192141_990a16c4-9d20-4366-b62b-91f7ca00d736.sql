
-- =============================================
-- RBAC SCHEMA FOR SALES OPEN
-- Idempotent migration
-- =============================================

-- 1. Trigger function
CREATE OR REPLACE FUNCTION public.rbac_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  module_scope text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  module text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  description text,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS (deny-all — access via Edge Functions only)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_roles ON public.roles;
CREATE POLICY deny_all_roles ON public.roles FOR ALL USING (false);

DROP POLICY IF EXISTS deny_all_permissions ON public.permissions;
CREATE POLICY deny_all_permissions ON public.permissions FOR ALL USING (false);

DROP POLICY IF EXISTS deny_all_role_permissions ON public.role_permissions;
CREATE POLICY deny_all_role_permissions ON public.role_permissions FOR ALL USING (false);

DROP POLICY IF EXISTS deny_all_user_roles ON public.user_roles;
CREATE POLICY deny_all_user_roles ON public.user_roles FOR ALL USING (false);

DROP POLICY IF EXISTS deny_all_audit_logs ON public.audit_logs;
CREATE POLICY deny_all_audit_logs ON public.audit_logs FOR ALL USING (false);

-- 4. Triggers
DROP TRIGGER IF EXISTS set_updated_at_roles ON public.roles;
CREATE TRIGGER set_updated_at_roles BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.rbac_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_permissions ON public.permissions;
CREATE TRIGGER set_updated_at_permissions BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.rbac_set_updated_at();

-- 5. RPC Functions (SECURITY DEFINER — bypass RLS safely)
CREATE OR REPLACE FUNCTION public.rbac_get_user_roles(p_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(r.name), ARRAY[]::text[])
  FROM user_roles ur JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.rbac_get_user_permissions(p_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT p.key), ARRAY[]::text[])
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id AND ur.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.rbac_user_has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active = true AND r.name = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.rbac_user_has_permission(p_user_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id AND ur.is_active = true AND p.key = p_permission
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active = true AND r.name = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.rbac_assign_role(
  p_actor_user_id uuid, p_target_user_id uuid, p_role text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT public.rbac_user_has_role(p_actor_user_id, 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin can assign roles';
  END IF;

  SELECT id INTO v_role_id FROM roles WHERE name = p_role;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found: %', p_role;
  END IF;

  INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
  VALUES (p_target_user_id, v_role_id, p_actor_user_id, true)
  ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true, assigned_by = p_actor_user_id, assigned_at = now();

  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, description, meta)
  VALUES (p_actor_user_id, 'user_role', p_target_user_id, 'role.assigned',
    'Role ' || p_role || ' assigned to user ' || p_target_user_id,
    jsonb_build_object('role', p_role, 'target_user_id', p_target_user_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.rbac_remove_role(
  p_actor_user_id uuid, p_target_user_id uuid, p_role text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT public.rbac_user_has_role(p_actor_user_id, 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin can remove roles';
  END IF;

  SELECT id INTO v_role_id FROM roles WHERE name = p_role;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found: %', p_role;
  END IF;

  UPDATE user_roles SET is_active = false
  WHERE user_id = p_target_user_id AND role_id = v_role_id;

  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, description, meta)
  VALUES (p_actor_user_id, 'user_role', p_target_user_id, 'role.removed',
    'Role ' || p_role || ' removed from user ' || p_target_user_id,
    jsonb_build_object('role', p_role, 'target_user_id', p_target_user_id));
END;
$$;

-- 6. Seed Roles
INSERT INTO public.roles (name, label, description, module_scope) VALUES
  ('admin', 'Administrador', 'Acesso total ao sistema', NULL),
  ('gerente_comercial', 'Gerente Comercial', 'Gestão de time comercial', 'sales'),
  ('comercial', 'Comercial', 'Vendedor / Executivo de contas', 'sales'),
  ('parceiro', 'Parceiro', 'Parceiro de canal', 'sales'),
  ('cliente', 'Cliente', 'Acesso de cliente', NULL),
  ('rh', 'RH', 'Recursos Humanos', 'hr'),
  ('cs', 'Customer Success', 'Sucesso do cliente', 'cs'),
  ('suporte', 'Suporte', 'Atendimento e suporte', 'support'),
  ('gerente_suporte', 'Gerente de Suporte', 'Gestão de suporte', 'support')
ON CONFLICT (name) DO NOTHING;

-- 7. Seed Permissions
INSERT INTO public.permissions (key, label, description, module) VALUES
  ('sales.access', 'Acesso ao módulo Sales', 'Permite acessar o módulo de vendas', 'sales'),
  ('lead.view', 'Visualizar leads', 'Permite ver leads', 'leads'),
  ('lead.create', 'Criar leads', 'Permite criar novos leads', 'leads'),
  ('lead.update', 'Editar leads', 'Permite editar leads existentes', 'leads'),
  ('lead.delete', 'Excluir leads', 'Permite excluir leads', 'leads'),
  ('lead.assign', 'Atribuir leads', 'Permite atribuir leads a outro usuário', 'leads'),
  ('company.view', 'Visualizar empresas', 'Permite ver contas/empresas', 'accounts'),
  ('company.create', 'Criar empresas', 'Permite criar novas contas', 'accounts'),
  ('contact.view', 'Visualizar contatos', 'Permite ver contatos', 'contacts'),
  ('contact.create', 'Criar contatos', 'Permite criar novos contatos', 'contacts'),
  ('opportunity.view', 'Visualizar oportunidades', 'Permite ver oportunidades', 'opportunities'),
  ('opportunity.create', 'Criar oportunidades', 'Permite criar novas oportunidades', 'opportunities'),
  ('opportunity.update', 'Editar oportunidades', 'Permite editar oportunidades', 'opportunities'),
  ('pipeline.view', 'Visualizar pipeline', 'Permite ver o pipeline', 'pipeline'),
  ('activity.view', 'Visualizar atividades', 'Permite ver atividades', 'activities'),
  ('activity.create', 'Criar atividades', 'Permite criar novas atividades', 'activities'),
  ('proposal.view', 'Visualizar propostas', 'Permite ver propostas', 'proposals'),
  ('proposal.create', 'Criar propostas', 'Permite criar novas propostas', 'proposals'),
  ('proposal.update', 'Editar propostas', 'Permite editar propostas', 'proposals'),
  ('proposal.send', 'Enviar propostas', 'Permite enviar propostas', 'proposals'),
  ('proposal.approve', 'Aprovar propostas', 'Permite aprovar propostas', 'proposals'),
  ('goal.view', 'Visualizar metas', 'Permite ver metas', 'goals'),
  ('commission.view', 'Visualizar comissões', 'Permite ver comissões', 'commissions'),
  ('commission.manage', 'Gerenciar comissões', 'Permite gerenciar comissões', 'commissions'),
  ('reports.view', 'Visualizar relatórios', 'Permite ver relatórios', 'reports'),
  ('rbac.view', 'Visualizar RBAC', 'Permite ver papéis e permissões', 'admin'),
  ('rbac.manage', 'Gerenciar RBAC', 'Permite gerenciar papéis e permissões', 'admin')
ON CONFLICT (key) DO NOTHING;

-- 8. Seed Role-Permission Mappings
-- Admin gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Gerente Comercial
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'gerente_comercial' AND p.key IN (
  'sales.access', 'lead.view', 'lead.create', 'lead.update', 'lead.delete', 'lead.assign',
  'company.view', 'company.create', 'contact.view', 'contact.create',
  'opportunity.view', 'opportunity.create', 'opportunity.update',
  'pipeline.view', 'activity.view', 'activity.create',
  'proposal.view', 'proposal.create', 'proposal.update', 'proposal.send', 'proposal.approve',
  'goal.view', 'commission.view', 'reports.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Comercial
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'comercial' AND p.key IN (
  'sales.access', 'lead.view', 'lead.create', 'lead.update',
  'company.view', 'company.create', 'contact.view', 'contact.create',
  'opportunity.view', 'opportunity.create', 'opportunity.update',
  'pipeline.view', 'activity.view', 'activity.create',
  'proposal.view', 'proposal.create', 'proposal.update', 'proposal.send',
  'goal.view', 'commission.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CS
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'cs' AND p.key IN (
  'sales.access', 'company.view', 'contact.view', 'opportunity.view',
  'pipeline.view', 'activity.view', 'activity.create'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Parceiro
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'parceiro' AND p.key IN (
  'sales.access', 'lead.view', 'lead.create',
  'company.view', 'opportunity.view', 'pipeline.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
