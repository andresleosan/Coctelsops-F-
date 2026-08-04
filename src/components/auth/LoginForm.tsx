'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Chrome } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginWithEmail, loginWithGoogle, translateAuthError } from '@/lib/auth-client';

function safeDestination(value: string | undefined): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishLogin = () => router.push(safeDestination(redirectTo));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      finishLogin();
    } catch (authError) {
      setError(translateAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginWithGoogleAccount = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      finishLogin();
    } catch (authError) {
      setError(translateAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button type="button" variant="outline" className="h-12 w-full rounded-xl border-primary/40" onClick={loginWithGoogleAccount} disabled={isSubmitting}>
        <Chrome className="h-5 w-5" /> Continuar con Google
      </Button>
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> o con tu correo <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Correo electrónico</Label>
          <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Contraseña</Label>
            <Link href="/recuperar-acceso" className="text-xs text-accent hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-12 w-full rounded-xl font-bold" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta? <Link href="/registro" className="font-semibold text-primary hover:underline">Regístrate</Link>
      </p>
    </div>
  );
}
