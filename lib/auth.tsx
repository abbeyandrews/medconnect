'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearSession, getToken, readStoredUser, setSession, setUnauthorizedHandler, storeUser } from './api';
import type { Role, User } from './types';

/**
 * One session for the whole app.
 *
 * Every account is a staff account with a role, so there is a single provider
 * rather than one per audience. Patients are not part of this at all — they
 * are served over USSD and never sign in.
 */

type AuthValue = {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<User>;
  signOut: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  can: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

/** Where each role lands after signing in. */
export function homeFor(user: Pick<User, 'role'> | null) {
  if (!user) return '/login';
  return '/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const signOut = useCallback(() => {
    // Fire-and-forget: the audit entry is nice to have, the redirect is not
    // allowed to wait on it.
    api.post('/auth/logout').catch(() => {});
    clearSession();
    setUserState(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUserState(null);
      router.replace('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  // Show the stored user immediately so the shell does not flash, then confirm
  // with the server that the session is still valid.
  useEffect(() => {
    // No token means nobody is signed in on this tab. Skip the round-trip:
    // calling /auth/me would 401, and the 401 handler above would redirect —
    // which would throw a signed-out visitor off the public landing page
    // before they ever saw it.
    if (!getToken()) {
      setUserState(null);
      setLoading(false);
      return;
    }

    const stored = readStoredUser<User>();
    if (stored) setUserState(stored);

    api
      .get<{ user: User }>('/auth/me')
      .then(({ user: fresh }) => {
        setUserState(fresh);
        storeUser(fresh);
      })
      .catch(() => setUserState(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { identifier, password });
    setSession(data.token, data.user);
    setUserState(data.user);
    return data.user;
  }, []);

  const refresh = useCallback(async () => {
    const { user: fresh } = await api.get<{ user: User }>('/auth/me');
    setUserState(fresh);
    storeUser(fresh);
  }, []);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    storeUser(next);
  }, []);

  const can = useCallback((...roles: Role[]) => Boolean(user && roles.includes(user.role)), [user]);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refresh, setUser, can }),
    [user, loading, signIn, signOut, refresh, setUser, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  receptionist: 'Receptionist',
  doctor: 'Doctor',
};
