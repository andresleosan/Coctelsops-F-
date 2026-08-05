'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { AccountNav } from '@/components/account/AccountNav';
import { useAuth } from '@/hooks/use-auth';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/cuenta')}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return <main className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 text-muted-foreground">Verificando tu acceso...</main>;
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-7 md:py-12">
      <div className="mb-7 space-y-2 md:mb-9">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">Tu espacio OPS</p>
        <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-primary neon-text-magenta md:text-5xl">Mi cuenta</h1>
        <p className="max-w-xl text-sm text-muted-foreground">Administra tus datos y revisa cada pedido desde un solo lugar.</p>
      </div>
      <div className="grid gap-7 md:grid-cols-[190px_1fr] md:items-start">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
