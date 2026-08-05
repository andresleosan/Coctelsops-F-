"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { AuditEntry } from "@/types/operations";

export default function AuditPage() {
  const { user } = useAuth(); const [entries, setEntries] = useState<AuditEntry[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { if (!user) return; setLoading(true); try { const response = await fetch("/api/admin/audit", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }); const body = await response.json() as { entries?: AuditEntry[]; error?: string }; if (!response.ok) throw new Error(body.error); setEntries(body.entries ?? []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la auditoría."); } finally { setLoading(false); } }
  // The request is intentionally refreshed when the authenticated user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [user]);
  return <AdminGuard permission="auditoria.read"><div className="space-y-6"><header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Control</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Auditoría</h1><p className="mt-1 text-sm text-slate-500">Trazabilidad de mutaciones por actor y módulo.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw /> Actualizar</Button></header>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}<Card><CardHeader><CardTitle className="text-lg">Actividad reciente</CardTitle></CardHeader><CardContent>{loading ? <div className="h-40 animate-pulse rounded-lg bg-slate-100" /> : entries.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">Aún no hay eventos de auditoría.</p> : <div className="overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Fecha</th><th className="p-3">Actor</th><th className="p-3">Módulo</th><th className="p-3">Acción</th><th className="p-3">Entidad</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-b"><td className="p-3">{new Date(entry.createdAt).toLocaleString("es-CO")}</td><td className="p-3">{entry.actorUid}</td><td className="p-3 capitalize">{entry.module}</td><td className="p-3 capitalize">{entry.action}</td><td className="p-3">{entry.entityId}</td></tr>)}</tbody></table></div>}</CardContent></Card></div></AdminGuard>;
}
