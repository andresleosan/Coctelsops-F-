'use client';

import { onIdTokenChanged, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useFirebase } from '@/firebase';
import { esClaimAdmin } from '@/lib/auth-claims';

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

  const refreshClaims = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const token = await user.getIdTokenResult(true);
      setIsAdmin(esClaimAdmin(token.claims));
    } catch {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setIsAdmin(false);
      setLoading(true);
      return;
    }

    let mounted = true;
    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      void nextUser
        .getIdTokenResult(true)
        .then((token) => {
          if (mounted) {
            setIsAdmin(esClaimAdmin(token.claims));
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setIsAdmin(false);
            setLoading(false);
          }
        });
    });

    return () => {
      mounted = false;
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
