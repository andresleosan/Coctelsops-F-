"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { RefreshCw, Save, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { PermissionGate } from "@/components/admin/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Role, UserProfile } from "@/types/auth";

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => ({})) as { users?: UserProfile[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los usuarios.");
      setUsers(body.users ?? []);
      const rolesResponse = await fetch("/api/admin/roles", { headers: { Authorization: `Bearer ${token}` } });
      if (rolesResponse.ok) {
        const rolesBody = await rolesResponse.json() as { roles?: Role[] };
        setRoles(rolesBody.roles ?? []);
      } else {
        setRoles([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [user]);

  async function toggleActive(account: UserProfile) {
    if (!user || !window.confirm(`¿${account.active ? "Desactivar" : "Activar"} a ${account.displayName ?? account.email}?`)) return;
    const response = await fetch(`/api/admin/users/${encodeURIComponent(account.uid)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ active: !account.active }),
    });
    const body = await response.json().catch(() => ({})) as { user?: UserProfile; error?: string };
    if (!response.ok || !body.user) {
      setError(body.error ?? "No se pudo actualizar el usuario.");
      return;
    }
    setUsers((items) => items.map((item) => item.uid === account.uid ? body.user as UserProfile : item));
  }

  function startRoleEdit(account: UserProfile) {
    setEditingUid(account.uid);
    setSelectedRoleIds(account.roleIds);
  }

  async function saveRoles(uid: string) {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ roleIds: selectedRoleIds }),
      });
      const body = await response.json().catch(() => ({})) as { user?: UserProfile; error?: string };
      if (!response.ok || !body.user) throw new Error(body.error ?? "No se pudieron guardar los roles.");
      setUsers((items) => items.map((item) => item.uid === uid ? body.user as UserProfile : item));
      setEditingUid(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los roles.");
    } finally {
      setSaving(false);
    }
  }

  return <AdminGuard permission="usuarios.read"><div className="space-y-6">
    <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Acceso</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Usuarios</h1></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Actualizar</Button></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading ? <div className="h-40 animate-pulse rounded-xl bg-white" /> : <div className="grid gap-3">{users.map((account) => <Card key={account.uid} className="border-slate-200 bg-white shadow-sm"><CardContent className="space-y-4 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 p-3 text-slate-700"><UserCog className="h-5 w-5" /></span><div><p className="font-semibold text-slate-900">{account.displayName ?? "Sin nombre"}</p><p className="text-sm text-slate-500">{account.email} · {account.accountType}</p></div></div><div className="flex items-center gap-3"><Badge variant={account.active ? "default" : "secondary"}>{account.active ? "Activo" : "Inactivo"}</Badge><PermissionGate permission="usuarios.manage"><Button variant="outline" size="sm" onClick={() => void toggleActive(account)}>{account.active ? "Desactivar" : "Activar"}</Button></PermissionGate></div></div><PermissionGate permission="usuarios.manage"><PermissionGate permission="roles.read"><div className="border-t border-slate-100 pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Roles asignados</p>{editingUid !== account.uid ? <Button variant="ghost" size="sm" onClick={() => startRoleEdit(account)}>Editar roles</Button> : <div className="flex gap-2"><Button size="sm" disabled={saving} onClick={() => void saveRoles(account.uid)}><Save /> {saving ? "Guardando..." : "Guardar roles"}</Button><Button variant="ghost" size="sm" onClick={() => setEditingUid(null)}>Cancelar</Button></div>}</div>{editingUid === account.uid ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{roles.map((role) => <label key={role.id} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={() => setSelectedRoleIds((current) => current.includes(role.id) ? current.filter((id) => id !== role.id) : [...current, role.id])} /> {role.name}</label>)}</div> : <p className="mt-2 text-sm text-slate-600">{account.roleIds.length ? account.roleIds.join(", ") : "Sin roles asignados"}</p>}</div></PermissionGate></PermissionGate></CardContent></Card>)}</div>}
  </div></AdminGuard>;
}
