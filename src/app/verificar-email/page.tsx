'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { sendVerificationEmail, translateAuthError } from '@/lib/auth-client';

export default function VerifyEmailPage() {
  const { user, isVerified, refreshClaims } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!user) {
    return (
      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 text-center">
        <div className="max-w-md space-y-4"><h1 className="text-2xl font-bold text-primary">Inicia sesión para continuar</h1><Button asChild><Link href="/login">Ir a ingresar</Link></Button></div>
      </main>
    );
  }

  const resend = async () => {
    setError('');
    setMessage('');
    setIsSending(true);
    try {
      await sendVerificationEmail(user);
      setMessage('Te enviamos un nuevo enlace de verificación. Revisa tu correo.');
    } catch (authError) {
      setError(translateAuthError(authError));
    } finally {
      setIsSending(false);
    }
  };

  const continueToStore = async () => {
    await user.reload();
    await refreshClaims();
    window.location.href = '/';
  };

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <MailCheck className="mx-auto h-16 w-16 text-accent neon-text-cyan" />
        <div className="space-y-2"><h1 className="font-headline text-3xl font-bold uppercase text-primary">Verifica tu correo</h1><p className="text-sm text-muted-foreground">Enviamos un enlace a <strong className="text-foreground">{user.email}</strong>. Verifica tu correo antes de hacer un pedido.</p></div>
        {isVerified ? <p className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">Tu correo ya está verificado.</p> : <Button className="w-full" onClick={continueToStore}>Ya verifiqué mi correo</Button>}
        {message && <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {!isVerified && <Button variant="outline" className="w-full" onClick={resend} disabled={isSending}>{isSending ? 'Enviando...' : 'Reenviar correo de verificación'}</Button>}
        <Button variant="ghost" asChild><Link href="/">Volver al inicio</Link></Button>
      </div>
    </main>
  );
}
