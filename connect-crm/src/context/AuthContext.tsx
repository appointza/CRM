import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { configureCrmSession } from "@/services/crmApi";
import { CRM_SESSION_STORAGE_KEY } from "@/constants/session";

export type Role = "super_admin" | "org_admin" | "staff";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization_id: string | null;
}

/** Session org; extra fields come from the API (settings, etc.). */
export interface Organization {
  id: string;
  name: string;
  plan?: string;
  industry?: string;
  country?: string;
  timezone?: string;
  website?: string;
  supportEmail?: string;
  billingEmail?: string;
  address?: string;
  gstin?: string;
  createdAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  organization: Organization | null;
  accessToken: string | null;
  hydrated: boolean;
  /** Pass `accessToken: null` to clear JWT. Omit token to keep the current token when only refreshing user/org. */
  setSession: (u: AuthUser | null, o: Organization | null, accessToken?: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function persistSession(
  user: AuthUser | null,
  organization: Organization | null,
  accessToken: string | null,
) {
  if (typeof window === "undefined") return;
  try {
    if (user && accessToken) {
      window.localStorage.setItem(
        CRM_SESSION_STORAGE_KEY,
        JSON.stringify({ user, organization, accessToken }),
      );
    } else {
      window.localStorage.removeItem(CRM_SESSION_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function readStoredSession(): {
  user: AuthUser | null;
  organization: Organization | null;
  accessToken: string | null;
} {
  if (typeof window === "undefined") {
    return { user: null, organization: null, accessToken: null };
  }
  try {
    const raw = window.localStorage.getItem(CRM_SESSION_STORAGE_KEY);
    if (!raw) return { user: null, organization: null, accessToken: null };
    const s = JSON.parse(raw);
    return {
      user: s.user ?? null,
      organization: s.organization ?? null,
      accessToken: s.accessToken ?? null,
    };
  } catch {
    return { user: null, organization: null, accessToken: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    setUser(stored.user);
    setOrganization(stored.organization);
    setAccessToken(stored.accessToken);
    setHydrated(true);
  }, []);

  const setSession = (u: AuthUser | null, o: Organization | null, token?: string | null) => {
    setUser(u);
    setOrganization(o);
    if (u === null) {
      setAccessToken(null);
      persistSession(null, null, null);
      return;
    }
    const nextToken = token !== undefined ? token : accessToken;
    if (token !== undefined) {
      setAccessToken(token);
    }
    persistSession(u, o, nextToken);
  };

  const logout = () => setSession(null, null);

  useEffect(() => {
    if (!hydrated) return;
    if (user && accessToken) {
      persistSession(user, organization, accessToken);
    }
  }, [user, organization, accessToken, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const orgHeader =
      user?.role === "super_admin" ? (organization?.id ?? null) : (user?.organization_id ?? null);
    configureCrmSession(() => ({ token: accessToken, orgHeader }));
  }, [user, organization, accessToken, hydrated]);

  return (
    <AuthContext.Provider value={{ user, organization, accessToken, hydrated, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
