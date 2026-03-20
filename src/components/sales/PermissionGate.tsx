import { useSalesAuth } from '@/contexts/SalesAuthContext';

interface PermissionGateProps {
  /** One or more role slugs; user must have at least one */
  allowedRoles?: string[];
  /** Permission key to check (e.g. 'lead.create') */
  permissionKey?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ allowedRoles, permissionKey, children, fallback = null }: PermissionGateProps) {
  const { roles, hasPermission } = useSalesAuth();

  // Admin always passes
  if (roles.includes('admin')) {
    return <>{children}</>;
  }

  // Permission-based check
  if (permissionKey) {
    if (!hasPermission(permissionKey)) return <>{fallback}</>;
  }

  // Role-based check
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((r) => roles.includes(r));
    if (!hasRole) return <>{fallback}</>;
  }

  return <>{children}</>;
}
