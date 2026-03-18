import { useSalesAuth } from '@/contexts/SalesAuthContext';

interface PermissionGateProps {
  permissionKey?: string;
  requiredScope?: 'own' | 'team' | 'all';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permissionKey, requiredScope, children, fallback = null }: PermissionGateProps) {
  const { hasSalesPermission, canReadOwn, canReadTeam, canReadAll } = useSalesAuth();

  if (permissionKey && !hasSalesPermission(permissionKey)) {
    return <>{fallback}</>;
  }

  if (requiredScope === 'own' && !canReadOwn()) return <>{fallback}</>;
  if (requiredScope === 'team' && !canReadTeam()) return <>{fallback}</>;
  if (requiredScope === 'all' && !canReadAll()) return <>{fallback}</>;

  return <>{children}</>;
}
