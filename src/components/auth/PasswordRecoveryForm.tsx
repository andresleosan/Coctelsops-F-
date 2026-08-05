'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendPasswordReset, translateAuthError } from '@/lib/auth-client';

const CONFIRMATION = 'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar tu contraseña.';

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      setMessage(CONFIRMATION);
    } catch (authError) {
      const code = typeof authError === 'object' && authError !== null && 'code' in authError ? (authError as { code?: unknown }).code : undefined;
      setMessage(code === 'auth/network-request-failed' ? '' : CONFIRMATION);
      if (code === 'auth/network-request-failed') {
        setError(translateAuthError(authError));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (message) {
    return (
      <div className="space-y-5 text-center">
        <p className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">{message}</p>
        <Button variant="outline" className="w-full" asChild><Link href="/login">Volver a ingresar</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recovery-email">Correo electrónico</Label>
        <Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-12 w-full rounded-xl font-bold" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
      </Button>
      <p className="text-center text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-accent hover:underline">Volver a ingresar</Link></p>
    </form>
  );
}
