'use client';

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import type { Permission } from "@/types/auth";

type PermissionGateProps = {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAllowed(false);
      return;
    }

    let active = true;
    void user.getIdToken().then(async (token) => {
      const response = await fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } });
      if (!active) return;
      if (!response.ok) {
        setAllowed(false);
        return;
      }
      const data = (await response.json()) as { user?: { accountType?: string; permissions?: Permission[] } };
      setAllowed(data.user?.accountType === "admin" || data.user?.permissions?.includes(permission) === true);
    }).catch(() => {
      if (active) setAllowed(false);
    });

    return () => {
      active = false;
    };
  }, [loading, permission, user]);

  if (loading || allowed === null) return null;
  return allowed ? children : fallback;
}
