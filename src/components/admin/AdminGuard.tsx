'use client';

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import type { Permission } from "@/types/auth";

type AdminGuardProps = {
  children: React.ReactNode;
  permission?: Permission;
};

type SessionResponse = {
  user?: { accountType?: string; permissions?: Permission[] };
};

export function AdminGuard({ children, permission }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const query = searchParams.toString();
      const destination = `${pathname}${query ? `?${query}` : ""}`;
      router.replace(`/admin/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }

    let active = true;
    setAllowed(null);
    void user.getIdToken().then(async (token) => {
      const response = await fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } });
      if (!active) return;
      if (!response.ok) {
        setAllowed(false);
        return;
      }
      const data = (await response.json()) as SessionResponse;
      const permissions = data.user?.permissions ?? [];
      setAllowed(permission
        ? data.user?.accountType === "admin" || permissions.includes(permission)
        : data.user?.accountType === "admin" || permissions.length > 0);
    }).catch(() => {
      if (active) setAllowed(false);
    });

    return () => {
      active = false;
    };
  }, [loading, pathname, permission, router, searchParams, user]);

  if (loading || !user || allowed === null) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Validando acceso...</div>;
  }

  if (!allowed) {
    return <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center px-6 text-center text-sm text-muted-foreground">No tienes permisos para ver esta sección.</div>;
  }

  return children;
}
