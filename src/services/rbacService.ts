import { getIdentityClient } from '@/lib/identityClient';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const identityClient = await getIdentityClient();
  const { data: { session } } = await identityClient.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

async function rbacPost(body: any) {
  const headers = await getAuthHeaders();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/sales-rbac`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'RBAC operation failed');
  return data;
}

// ===== User Context =====
export async function fetchMyRbacContext() {
  return rbacPost({ action: 'my-context' });
}

// ===== Admin Operations =====
export async function fetchRoles() {
  return rbacPost({ action: 'list-roles' });
}

export async function fetchPermissions() {
  return rbacPost({ action: 'list-permissions' });
}

export async function fetchUsersWithRoles() {
  return rbacPost({ action: 'list-users-roles' });
}

export async function fetchRolePermissions(roleId: string) {
  return rbacPost({ action: 'role-permissions', role_id: roleId });
}

export async function assignRole(targetUserId: string, roleId: string) {
  return rbacPost({ action: 'assign-role', target_user_id: targetUserId, role_id: roleId });
}

export async function removeRole(targetUserId: string, roleId: string) {
  return rbacPost({ action: 'remove-role', target_user_id: targetUserId, role_id: roleId });
}
