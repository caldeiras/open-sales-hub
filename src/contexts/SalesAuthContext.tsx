import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ScopeType } from '@/types/sales';

interface SalesAuthContextType {
  userId: string | null;
  userEmail: string | null;
  roleCode: string | null;
  scopeType: ScopeType | null;
  teamId: string | null;
  loading: boolean;
  hasSalesPermission: (permissionKey: string) => boolean;
  canReadOwn: () => boolean;
  canReadTeam: () => boolean;
  canReadAll: () => boolean;
  permissions: string[];
}

const SalesAuthContext = createContext<SalesAuthContextType>({
  userId: null,
  userEmail: null,
  roleCode: null,
  scopeType: null,
  teamId: null,
  loading: true,
  hasSalesPermission: () => false,
  canReadOwn: () => false,
  canReadTeam: () => false,
  canReadAll: () => false,
  permissions: [],
});

export const useSalesAuth = () => useContext(SalesAuthContext);

export function SalesAuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<ScopeType | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        await loadSalesContext(session.user.id);
      } else {
        resetState();
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        loadSalesContext(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setUserId(null);
    setUserEmail(null);
    setRoleCode(null);
    setScopeType(null);
    setTeamId(null);
    setPermissions([]);
  };

  const loadSalesContext = async (uid: string) => {
    try {
      const client = supabase as any;
      
      // Get role code via RPC
      const { data: role } = await client.rpc('rbac_get_user_role_code', {
        p_user_id: uid,
        p_app_code: 'sales'
      });
      if (role) setRoleCode(role);

      // Get scope type via RPC
      const { data: scope } = await client.rpc('rbac_get_scope_type', {
        p_user_id: uid,
        p_app_code: 'sales'
      });
      if (scope) setScopeType(scope as ScopeType);

      // Get team id via RPC
      const { data: team } = await client.rpc('rbac_get_team_id', {
        p_user_id: uid,
        p_app_code: 'sales'
      });
      if (team) setTeamId(team);

    } catch (err) {
      console.warn('Failed to load sales RBAC context:', err);
      // Defaults for development/testing
      setRoleCode('admin');
      setScopeType('all');
      setPermissions([]);
    }
  };

  const hasSalesPermission = (permissionKey: string) => {
    if (roleCode === 'admin') return true;
    return permissions.includes(permissionKey);
  };

  const canReadOwn = () => scopeType === 'own' || scopeType === 'team' || scopeType === 'all';
  const canReadTeam = () => scopeType === 'team' || scopeType === 'all';
  const canReadAll = () => scopeType === 'all';

  return (
    <SalesAuthContext.Provider value={{
      userId, userEmail, roleCode, scopeType, teamId, loading,
      hasSalesPermission, canReadOwn, canReadAll, canReadTeam, permissions,
    }}>
      {children}
    </SalesAuthContext.Provider>
  );
}
