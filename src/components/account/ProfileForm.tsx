'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MapPin, Plus, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import type { Address, CustomerProfile } from '@/types/auth';

function newAddress(): Address {
  return { id: `direccion-${Date.now()}`, alias: '', recipientName: '', phone: '', address: '', neighborhood: '', city: 'Medellín', notes: '' };
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || fallback;
}

export function ProfileForm() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [telefono, setTelefono] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    void user.getIdToken().then(async (token) => {
      const response = await fetch('/api/account/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (!active) return;
      if (!response.ok) {
        setError(await readError(response, 'No pudimos cargar tu perfil.'));
        setLoading(false);
        return;
      }
      const data = await response.json() as { profile: CustomerProfile };
      setProfile(data.profile);
      setDisplayName(data.profile.displayName ?? '');
      setTelefono(data.profile.telefono ?? '');
      setAddresses(data.profile.addresses ?? []);
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('No pudimos conectar con la central de cuentas.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [user]);

  const updateAddress = (index: number, field: keyof Address, value: string) => {
    setAddresses((current) => current.map((address, addressIndex) => addressIndex === index ? { ...address, [field]: value } : address));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: displayName.trim() || null, telefono: telefono.trim() || null, addresses }),
      });
      if (!response.ok) {
        setError(await readError(response, 'Revisa los datos de tu perfil.'));
        return;
      }
      const data = await response.json() as { profile: CustomerProfile };
      setProfile(data.profile);
      setDisplayName(data.profile.displayName ?? '');
      setTelefono(data.profile.telefono ?? '');
      setAddresses(data.profile.addresses ?? []);
      setSuccess('Perfil guardado.');
    } catch {
      setError('No pudimos conectar con la central de cuentas.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">Cargando tu perfil...</div>;
  if (!profile) return <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error || 'Tu perfil no está disponible.'}</p>;

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className="border-primary/20 bg-card/80 shadow-xl shadow-primary/5">
        <CardHeader className="border-b border-border/70 p-5 md:p-6">
          <CardTitle className="text-lg uppercase tracking-tight text-primary">Datos personales</CardTitle>
          <p className="text-sm text-muted-foreground">El correo pertenece a tu acceso y no se puede cambiar aquí.</p>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="profile-email">Correo electrónico</Label>
            <Input id="profile-email" value={profile.email} readOnly disabled className="bg-muted/40" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input id="profile-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} autoComplete="name" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-phone">Teléfono de contacto</Label>
            <Input id="profile-phone" type="tel" value={telefono} onChange={(event) => setTelefono(event.target.value)} maxLength={20} autoComplete="tel" placeholder="324 555 0000" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/20 bg-card/80 shadow-xl shadow-accent/5">
        <CardHeader className="flex-row items-center justify-between border-b border-border/70 p-5 md:p-6">
          <div><CardTitle className="flex items-center gap-2 text-lg uppercase tracking-tight text-accent"><MapPin className="h-5 w-5" /> Direcciones</CardTitle><p className="mt-1 text-sm text-muted-foreground">Guarda tus destinos habituales.</p></div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAddresses((current) => [...current, newAddress()])}><Plus className="mr-1 h-4 w-4" /> Agregar</Button>
        </CardHeader>
        <CardContent className="space-y-4 p-5 md:p-6">
          {addresses.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Aún no tienes direcciones guardadas.</p>}
          {addresses.map((address, index) => (
            <div key={address.id} className="space-y-4 rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Dirección {index + 1}</p><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar dirección ${index + 1}`} onClick={() => setAddresses((current) => current.filter((_, addressIndex) => addressIndex !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
              <div className="grid gap-4 sm:grid-cols-2">
                {([['alias', 'Alias', 'Casa'], ['recipientName', 'Nombre de quien recibe', 'Nombre completo'], ['phone', 'Teléfono', '324 555 0000'], ['address', 'Dirección', 'Carrera 37 # 66-36'], ['neighborhood', 'Barrio', 'Villa Hermosa'], ['city', 'Ciudad', 'Medellín']] as const).map(([field, label, placeholder]) => (
                  <div key={field} className="space-y-2"><Label htmlFor={`address-${index}-${field}`}>{label}</Label><Input id={`address-${index}-${field}`} value={address[field]} onChange={(event) => updateAddress(index, field, event.target.value)} placeholder={placeholder} maxLength={200} /></div>
                ))}
              </div>
              <div className="space-y-2"><Label htmlFor={`address-${index}-notes`}>Indicaciones</Label><Textarea id={`address-${index}-notes`} value={address.notes ?? ''} onChange={(event) => updateAddress(index, 'notes', event.target.value)} maxLength={300} placeholder="Piso, torre o referencia" /></div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-accent">{success}</p>}
      <Button type="submit" size="lg" disabled={saving} className="w-full rounded-xl font-bold shadow-lg shadow-primary/20 sm:w-auto"><Save className="mr-2 h-4 w-4" />{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
    </form>
  );
}
