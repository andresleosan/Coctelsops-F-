import { GlassWater } from 'lucide-react';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-primary/20 bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <GlassWater className="mx-auto h-10 w-10 text-primary neon-text-magenta" />
          <CardTitle className="font-headline text-3xl uppercase tracking-tight text-primary">Crear cuenta</CardTitle>
          <p className="text-sm text-muted-foreground">Regístrate para pedir y seguir tus pedidos.</p>
        </CardHeader>
        <CardContent><RegisterForm /></CardContent>
      </Card>
    </main>
  );
}
