import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface CoreProfile {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  [key: string]: any;
}

interface SalesAuthContextType {
  user: User | null;
  session: Session | null;
  profile: CoreProfile | null;
  roles: string[];
  loading: boolean;
  coreConnected: boolean;
  isAuthenticated: boolean;
  hasRole: (roleSlug: string) => boolean;
  hasAnyRole: (roleSlugs: string[]) => boolean;
  signOut: () => Promise<void>;
}

const SalesAuthContext = createContext<SalesAuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  loading: true,
  coreConnected: false,
  isAuthenticated: false,
  hasRole: () => false,
  hasAnyRole: () => false,
  signOut: async () => {},
});

export const useSalesAuth = () => useContext(SalesAuthContext);

export function SalesAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CoreProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [coreConnected, setCoreConnected] = useState(false);

  const loadCoreContext = useCallback(async (currentSession: Session) => {
    try {
      const { data, error } = await supabase.functions.invoke('core-auth-context', {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });

      if (error) {
        console.warn('Failed to load CORE context:', error);
        return;
      }

      if (data) {
        setProfile(data.profile || null);
        setRoles(data.roles || []);
        setCoreConnected(data.core_connected || false);
      }
    } catch (err) {
      console.warn('CORE context fetch error:', err);
    }
  }, []);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          // Defer CORE context loading to avoid deadlocks
          setTimeout(() => loadCoreContext(currentSession), 0);
        } else {
          setProfile(null);
          setRoles([]);
          setCoreConnected(false);
        }
        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession) {
        loadCoreContext(initialSession);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadCoreContext]);

  const hasRole = useCallback((roleSlug: string) => {
    return roles.includes(roleSlug);
  }, [roles]);

  const hasAnyRole = useCallback((roleSlugs: string[]) => {
    return roleSlugs.some((slug) => roles.includes(slug));
  }, [roles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isAuthenticated = !!user;

  return (
    <SalesAuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        coreConnected,
        isAuthenticated,
        hasRole,
        hasAnyRole,
        signOut,
      }}
    >
      {children}
    </SalesAuthContext.Provider>
  );
}
