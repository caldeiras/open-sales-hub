import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCoreClient } from '@/lib/coreClient';
import type { Session, User, SupabaseClient } from '@supabase/supabase-js';

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

  const loadProfileAndRoles = useCallback(async (coreClient: SupabaseClient, currentUser: User) => {
    try {
      // Read profile directly from CORE
      const { data: profileData } = await coreClient
        .from('profiles')
        .select('*')
        .eq('email', currentUser.email)
        .maybeSingle();

      setProfile(profileData || null);

      if (profileData) {
        const { data: userRoles } = await coreClient
          .from('user_roles')
          .select('role:roles(slug, name)')
          .eq('user_id', profileData.id || profileData.user_id);

        if (userRoles) {
          const roleSlugs = userRoles
            .map((ur: any) => ur.role?.slug || ur.role?.name)
            .filter(Boolean);
          setRoles(roleSlugs);
        }
      }

      setCoreConnected(true);
    } catch (err) {
      console.warn('Failed to load CORE profile/roles:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const coreClient = await getCoreClient();

        // Set up auth listener on CORE client
        const { data: { subscription } } = coreClient.auth.onAuthStateChange(
          async (_event, currentSession) => {
            if (!mounted) return;

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
              setTimeout(() => {
                if (mounted) loadProfileAndRoles(coreClient, currentSession.user);
              }, 0);
            } else {
              setProfile(null);
              setRoles([]);
              setCoreConnected(false);
            }
            setLoading(false);
          }
        );

        // Get initial session from CORE
        const { data: { session: initialSession } } = await coreClient.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await loadProfileAndRoles(coreClient, initialSession.user);
        }
        setLoading(false);

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Failed to initialize CORE auth:', err);
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [loadProfileAndRoles]);

  const hasRole = useCallback((roleSlug: string) => {
    return roles.includes(roleSlug);
  }, [roles]);

  const hasAnyRole = useCallback((roleSlugs: string[]) => {
    return roleSlugs.some((slug) => roles.includes(slug));
  }, [roles]);

  const signOut = useCallback(async () => {
    const coreClient = await getCoreClient();
    await coreClient.auth.signOut();
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
