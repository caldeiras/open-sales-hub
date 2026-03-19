import { useSalesAuth } from '@/contexts/SalesAuthContext';

interface PermissionGateProps {
  /** One or more role slugs; user must have at least one */
  allowedRoles?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ allowedRoles, children, fallback = null }: PermissionGateProps) {
  const { hasAnyRole, roles } = useSalesAuth();

  // If no role restriction, always render
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Admin always passes
  if (roles.includes('admin')) {
    return <>{children}</>;
  }

  if (!hasAnyRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
