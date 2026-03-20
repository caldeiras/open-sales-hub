import { getCommercialClient } from '@/lib/commercialClient';

// ===== User Context =====
export async function fetchMyRbacContext() {
  // Still use Edge Function for auth-context (needs JWT validation)
  const { getIdentityClient } = await import('@/lib/identityClient');
  const identityClient = await getIdentityClient();
  const { data: { session } } = await identityClient.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/sales-rbac`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'my-context' }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load RBAC context');
  return data;
}

// ===== Roles =====
export async function fetchRoles() {
  const db = await getCommercialClient();
  const { data, error } = await db.rpc('get_roles');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    label: r.name,
    description: r.description,
    level: r.level,
    permission_count: r.permission_count,
    user_count: r.user_count,
    created_at: r.created_at,
  }));
}

// ===== Permissions =====
export async function fetchPermissions() {
  const db = await getCommercialClient();
  const { data, error } = await db.rpc('get_permissions');
  if (error) throw new Error(error.message);
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    key: p.name,
    module: p.module,
    description: p.description,
    label: p.description || p.name,
    created_at: p.created_at,
  }));
}

// ===== Users with Roles (grouped) =====
export async function fetchUsersWithRoles() {
  const db = await getCommercialClient();
  const { data, error } = await db.rpc('get_user_roles_raw');
  if (error) throw new Error(error.message);

  const raw = data || [];
  const userMap: Record<string, any> = {};
  for (const row of raw) {
    const uid = row.user_id;
    if (!userMap[uid]) {
      userMap[uid] = { user_id: uid, roles: [] };
    }
    userMap[uid].roles.push({
      id: row.role_id,
      name: row.role_name,
      label: row.role_name,
      level: row.role_level,
      assigned_at: row.assigned_at,
    });
  }
  return Object.values(userMap);
}

// ===== Role Permissions =====
export async function fetchRolePermissions(roleId: string) {
  const db = await getCommercialClient();
  const { data, error } = await db
    .from('role_permissions')
    .select('permission_id, permissions(name, module)')
    .eq('role_id', roleId);

  if (error) throw new Error(error.message);
  return (data || []).map((rp: any) => ({
    permission_name: rp.permissions?.name,
    key: rp.permissions?.name,
    module: rp.permissions?.module,
  }));
}

// ===== Assign Role =====
export async function assignRole(targetUserId: string, roleId: string) {
  const db = await getCommercialClient();
  const { data, error } = await db.rpc('assign_role', {
    p_user_id: targetUserId,
    p_role_id: roleId,
  });
  if (error) throw new Error(error.message);
  if (data && data.success === false) throw new Error('Failed to assign role');
  return data;
}

// ===== Remove Role =====
export async function removeRole(targetUserId: string, roleId: string) {
  const db = await getCommercialClient();
  const { data, error } = await db.rpc('remove_role', {
    p_user_id: targetUserId,
    p_role_id: roleId,
  });
  if (error) throw new Error(error.message);
  if (data && data.success === false) throw new Error('Failed to remove role');
  return data;
}
