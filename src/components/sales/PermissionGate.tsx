import { useSalesAuth } from '@/contexts/SalesAuthContext';

interface PermissionGateProps {
  /** One or more role slugs; user must have at least one */
  allowedRoles?: string[];
  /** Legacy prop: treated as a role check (admin always passes) */
  permissionKey?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ allowedRoles, permissionKey, children, fallback = null }: PermissionGateProps) {
  const { roles } = useSalesAuth();

  // Admin always passes
  if (roles.includes('admin')) {
    return <>{children}</>;
  }

  // If permissionKey is set, check if user has admin role (only admins for now)
  if (permissionKey) {
    // For now, permission-based actions require admin role
    // This will evolve to a proper permission system later
    return <>{fallback}</>;
  }

  // Role-based check
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((r) => roles.includes(r));
    if (!hasRole) return <>{fallback}</>;
  }

  return <>{children}</>;
}
