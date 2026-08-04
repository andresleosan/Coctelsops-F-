'use client';

import Link from 'next/link';
import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { logout } from '@/lib/auth-client';

export function AuthStatus() {
  const { user, loading, isAdmin } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (loading) {
    return <div className="hidden h-9 w-20 animate-pulse rounded-full bg-muted sm:block" aria-label="Cargando sesión" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Ingresar</Link>
        </Button>
        <Button size="sm" className="px-2 text-xs sm:px-3" asChild>
          <Link href="/registro">Crear cuenta</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button variant="ghost" size="sm" className="hidden max-w-[130px] items-center gap-1 truncate sm:inline-flex" asChild>
        <Link href="/cuenta" title={user.displayName ?? user.email ?? 'Mi cuenta'}>
          <UserRound className="h-4 w-4 shrink-0" />
          <span className="truncate">{user.displayName ?? 'Mi cuenta'}</span>
        </Link>
      </Button>
      {isAdmin && (
        <Button variant="ghost" size="icon" asChild title="Panel de administración">
          <Link href="/admin/dashboard" aria-label="Panel de administración">
            <ShieldCheck className="h-5 w-5 text-accent" />
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        disabled={isLoggingOut}
        onClick={async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } finally {
            setIsLoggingOut(false);
          }
        }}
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}
