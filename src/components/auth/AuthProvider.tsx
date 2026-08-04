'use client';

import { onIdTokenChanged, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useFirebase } from '@/firebase';
import { esClaimAdmin } from '@/lib/auth-claims';
import { isCurrentAuthSession } from '@/lib/auth-session';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  refreshClaims: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const sessionVersion = useRef(0);
  const currentUser = useRef<User | null>(null);

  const refreshClaims = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const refreshVersion = sessionVersion.current;
    const refreshUser = user;

    try {
      const token = await refreshUser.getIdTokenResult(true);
      if (isCurrentAuthSession(sessionVersion.current, refreshVersion) && currentUser.current === refreshUser) {
        setIsAdmin(esClaimAdmin(token.claims));
      }
    } catch {
      if (isCurrentAuthSession(sessionVersion.current, refreshVersion) && currentUser.current === refreshUser) {
        setIsAdmin(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!auth) {
      sessionVersion.current += 1;
      currentUser.current = null;
      setUser(null);
      setIsAdmin(false);
      setLoading(true);
      return;
    }

    let mounted = true;
    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      const callbackVersion = ++sessionVersion.current;
      currentUser.current = nextUser;
      setUser(nextUser);

      if (!nextUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      void nextUser
        .getIdTokenResult(true)
        .then((token) => {
          if (mounted && isCurrentAuthSession(sessionVersion.current, callbackVersion) && currentUser.current === nextUser) {
            setIsAdmin(esClaimAdmin(token.claims));
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted && isCurrentAuthSession(sessionVersion.current, callbackVersion) && currentUser.current === nextUser) {
            setIsAdmin(false);
            setLoading(false);
          }
        });
    });

    return () => {
      mounted = false;
      sessionVersion.current += 1;
      currentUser.current = null;
      unsubscribe();
    };
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user, loading, isVerified: Boolean(user?.emailVerified), isAdmin, refreshClaims }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
