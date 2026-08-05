"use client";

import { Bell, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@/types/operations";

export default function NotificationsPage() {
  const { user } = useAuth(); const [notifications, setNotifications] = useState<Notification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { if (!user) return; setLoading(true); try { const response = await fetch("/api/notifications?admin=true", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }); const body = await response.json() as { notifications?: Notification[]; error?: string }; if (!response.ok) throw new Error(body.error); setNotifications(body.notifications ?? []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las notificaciones."); } finally { setLoading(false); } }
  // The request is intentionally refreshed when the authenticated user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [user]);
  async function markRead(id: string) { if (!user) return; await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ id }) }); setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification)); }
  return <AdminGuard permission="notificaciones.read"><div className="space-y-6"><header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Bandeja interna</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Notificaciones</h1><p className="mt-1 text-sm text-slate-500">Avisos internos de nuevos pedidos y operación. WhatsApp no se envía automáticamente.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw /> Actualizar</Button></header>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}<Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-cyan-700" /> Bandeja de equipo</CardTitle></CardHeader><CardContent>{loading ? <div className="h-40 animate-pulse rounded-lg bg-slate-100" /> : notifications.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No hay notificaciones nuevas.</p> : <div className="space-y-3">{notifications.map((notification) => <div key={notification.id} className={`rounded-lg border p-4 ${notification.read ? "bg-white" : "border-cyan-200 bg-cyan-50/60"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold text-slate-900">{notification.title}</p><p className="mt-1 text-sm text-slate-600">{notification.message}</p><p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString("es-CO")}</p></div>{!notification.read && <Button size="sm" variant="outline" onClick={() => void markRead(notification.id)}>Marcar leída</Button>}</div></div>)}</div>}</CardContent></Card></div></AdminGuard>;
}
