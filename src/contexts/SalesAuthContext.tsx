import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getIdentityClient } from '@/lib/identityClient';
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

  const loadProfileAndRoles = useCallback(async (identityClient: SupabaseClient, currentUser: User) => {
    try {
      const { data: profileData } = await identityClient
        .from('profiles')
        .select('*')
        .eq('email', currentUser.email)
        .maybeSingle();

      setProfile(profileData || null);

      if (profileData) {
        const { data: userRoles } = await identityClient
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
    } catch (err) {
      console.warn('Failed to load IDENTITY profile/roles:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const identityClient = await getIdentityClient();

        const { data: { subscription } } = identityClient.auth.onAuthStateChange(
          async (_event, currentSession) => {
            if (!mounted) return;

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
              setTimeout(() => {
                if (mounted) loadProfileAndRoles(identityClient, currentSession.user);
              }, 0);
            } else {
              setProfile(null);
              setRoles([]);
            }
            setLoading(false);
          }
        );

        const { data: { session: initialSession } } = await identityClient.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await loadProfileAndRoles(identityClient, initialSession.user);
        }
        setLoading(false);

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Failed to initialize IDENTITY auth:', err);
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [loadProfileAndRoles]);

  const hasRole = useCallback((roleSlug: string) => roles.includes(roleSlug), [roles]);
  const hasAnyRole = useCallback((roleSlugs: string[]) => roleSlugs.some((s) => roles.includes(s)), [roles]);

  const signOut = useCallback(async () => {
    const identityClient = await getIdentityClient();
    await identityClient.auth.signOut();
  }, []);

  return (
    <SalesAuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        isAuthenticated: !!user,
        hasRole,
        hasAnyRole,
        signOut,
      }}
    >
      {children}
    </SalesAuthContext.Provider>
  );
}
