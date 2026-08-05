'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerWithEmail, translateAuthError } from '@/lib/auth-client';

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await registerWithEmail(email, password, displayName);
      router.push('/verificar-email');
    } catch (authError) {
      setError(translateAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-name">Nombre</Label>
        <Input id="register-name" autoComplete="name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-email">Correo electrónico</Label>
        <Input id="register-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-password">Contraseña</Label>
        <Input id="register-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <p className="text-xs text-muted-foreground">Usa al menos 8 caracteres.</p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-12 w-full rounded-xl font-bold" disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-primary hover:underline">Ingresa</Link>
      </p>
    </form>
  );
}
