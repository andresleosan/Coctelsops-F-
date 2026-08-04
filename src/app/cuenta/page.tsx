'use client';

import Link from 'next/link';
import { UserRound, MailCheck, MailWarning } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export default function AccountPage() {
  const { user, loading, isVerified } = useAuth();

  if (loading) {
    return <main className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 text-muted-foreground">Cargando tu cuenta...</main>;
  }

  if (!user) {
    return (
      <main className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 text-center">
        <div className="space-y-4"><h1 className="text-2xl font-bold text-primary">Inicia sesión para ver tu cuenta</h1><Button asChild><Link href="/login">Ir a ingresar</Link></Button></div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
      <div className="mb-8 space-y-2"><p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Tu espacio OPS</p><h1 className="font-headline text-4xl font-bold uppercase tracking-tight text-primary neon-text-magenta">Mi cuenta</h1></div>
      <Card className="border-primary/20 bg-card/80 shadow-2xl shadow-primary/10">
        <CardHeader><CardTitle className="flex items-center gap-3"><UserRound className="h-6 w-6 text-primary" /> Datos de acceso</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Nombre</p><p className="mt-1 font-semibold">{user.displayName || 'Sin nombre'}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Correo</p><p className="mt-1 break-all font-semibold">{user.email}</p></div>
          </div>
          <div className={isVerified ? 'flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent' : 'flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary'}>
            {isVerified ? <MailCheck className="h-5 w-5 shrink-0" /> : <MailWarning className="h-5 w-5 shrink-0" />}
            {isVerified ? 'Correo verificado. Ya puedes hacer pedidos.' : 'Verifica tu correo para hacer pedidos.'}
          </div>
          {!isVerified && <Button asChild><Link href="/verificar-email">Verificar correo</Link></Button>}
          <Button variant="outline" asChild><Link href="/menu">Explorar el menú</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
