import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getIdentityClient } from "@/lib/identityClient";
import type { Session, User } from "@supabase/supabase-js";

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
  permissions: string[];
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (roleSlug: string) => boolean;
  hasAnyRole: (roleSlugs: string[]) => boolean;
  hasPermission: (permissionKey: string) => boolean;
  signOut: () => Promise<void>;
}

const SalesAuthContext = createContext<SalesAuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  permissions: [],
  loading: true,
  isAuthenticated: false,
  hasRole: () => false,
  hasAnyRole: () => false,
  hasPermission: () => false,
  signOut: async () => {},
});

export const useSalesAuth = () => useContext(SalesAuthContext);

export function SalesAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CoreProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRbacContext = useCallback(async (accessToken: string) => {
    try {
      // Aponta para core-open (zkjrcenhemnnlmjiysbc) — não mais para o Lovable Cloud
      const coreOpenUrl = import.meta.env.VITE_CORE_OPEN_URL;
      const coreOpenAnonKey = import.meta.env.VITE_CORE_OPEN_ANON_KEY;

      const res = await fetch(`${coreOpenUrl}/functions/v1/sales-rbac`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: coreOpenAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "my-context" }),
      });
      if (res.ok) {
        const ctx = await res.json();
        setRoles(ctx.roles || []);
        setPermissions(ctx.permissions || []);
        return;
      }
    } catch (err) {
      console.warn("Failed to load RBAC context from Edge Function:", err);
    }
    // Fallback: clear
    setRoles([]);
    setPermissions([]);
  }, []);

  const loadProfileFromIdentity = useCallback(async (currentUser: User) => {
    try {
      const identityClient = await getIdentityClient();
      const { data: profileData } = await identityClient
        .from("profiles")
        .select("*")
        .eq("email", currentUser.email)
        .maybeSingle();
      setProfile(profileData || null);
    } catch (err) {
      console.warn("Failed to load IDENTITY profile:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const identityClient = await getIdentityClient();

        const {
          data: { subscription },
        } = identityClient.auth.onAuthStateChange(async (_event, currentSession) => {
          if (!mounted) return;

          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            setTimeout(() => {
              if (mounted) {
                loadProfileFromIdentity(currentSession.user);
                loadRbacContext(currentSession.access_token);
              }
            }, 0);
          } else {
            setProfile(null);
            setRoles([]);
            setPermissions([]);
          }
          setLoading(false);
        });

        const {
          data: { session: initialSession },
        } = await identityClient.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await Promise.all([
            loadProfileFromIdentity(initialSession.user),
            loadRbacContext(initialSession.access_token),
          ]);
        }
        setLoading(false);

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Failed to initialize IDENTITY auth:", err);
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [loadProfileFromIdentity, loadRbacContext]);

  const hasRole = useCallback((roleSlug: string) => roles.includes(roleSlug), [roles]);
  const hasAnyRole = useCallback((roleSlugs: string[]) => roleSlugs.some((s) => roles.includes(s)), [roles]);
  const hasPermission = useCallback(
    (key: string) => roles.includes("admin") || permissions.includes(key),
    [roles, permissions],
  );

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
        permissions,
        loading,
        isAuthenticated: !!user,
        hasRole,
        hasAnyRole,
        hasPermission,
        signOut,
      }}
    >
      {children}
    </SalesAuthContext.Provider>
  );
}
