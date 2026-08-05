"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { Search, RefreshCw, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PermissionGate } from "@/components/admin/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getOrderAction } from "@/lib/orders/status-actions";
import type { Order, OrderStatus } from "@/types/orders";

const statuses: Array<OrderStatus | "todos"> = ["todos", "pendiente", "confirmado", "preparando", "en_camino", "entregado", "cancelado"];

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderStatus | "todos">("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadOrders() {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/pedidos", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const body = await response.json().catch(() => ({})) as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los pedidos.");
      setOrders(body.orders ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pedidos."); } finally { setLoading(false); }
  }

  useEffect(() => { void loadOrders(); }, [user]);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = status === "todos" || order.status === status;
    const normalized = query.trim().toLocaleLowerCase();
    const matchesQuery = !normalized || order.customerName.toLocaleLowerCase().includes(normalized) || order.phone.includes(normalized) || order.id.toLocaleLowerCase().includes(normalized);
    return matchesStatus && matchesQuery;
  }), [orders, query, status]);

  async function updateStatus(order: Order) {
    const action = getOrderAction(order.status);
    if (!action || !user) return;
    if (!window.confirm(`¿Quieres marcar el pedido de ${order.customerName} como ${action.nextStatus.replace("_", " ")}?`)) return;
    setActionError("");
    try {
      const response = await fetch(`/api/pedidos/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ status: action.nextStatus }) });
      const body = await response.json().catch(() => ({})) as { order?: Order; error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar el pedido.");
      setOrders((current) => current.map((item) => item.id === order.id && body.order ? body.order : item));
    } catch (updateError) { setActionError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el pedido."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Operaciones</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Pedidos</h1><p className="mt-1 text-sm text-slate-500">Gestiona el estado de cada pedido sin escribir directamente en Firestore.</p></div><Button variant="outline" onClick={() => void loadOrders()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Actualizar</Button></div>
      <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="flex flex-col gap-3 p-4 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, teléfono o pedido" className="pl-9" aria-label="Buscar pedidos" /></div><select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "todos")} className="h-10 rounded-md border border-input bg-white px-3 text-sm text-slate-700" aria-label="Filtrar por estado">{statuses.map((item) => <option key={item} value={item}>{item === "todos" ? "Todos los estados" : item.replace("_", " ")}</option>)}</select></CardContent></Card>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {actionError && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{actionError}</div>}
      {loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-white" />)}</div> : filteredOrders.length === 0 ? <Card className="border-dashed border-slate-300 bg-white"><CardContent className="p-10 text-center text-sm text-slate-500">No encontramos pedidos con estos filtros.</CardContent></Card> : <div className="space-y-3">{filteredOrders.map((order) => { const action = getOrderAction(order.status); return <Card key={order.id} className="border-slate-200 bg-white shadow-sm"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{order.customerName}</p><Badge variant="outline" className="capitalize">{order.status.replace("_", " ")}</Badge></div><p className="mt-1 text-xs text-slate-500">#{order.id} · {order.phone} · {order.items.length} productos</p><p className="mt-2 text-sm text-slate-600">{order.address}</p></div><div className="flex items-center justify-between gap-3 lg:justify-end"><span className="font-bold text-slate-900">${order.total.toLocaleString("es-CO")}</span><PermissionGate permission="pedidos.update">{action && <Button size="sm" onClick={() => void updateStatus(order)}>{action.label.toLocaleLowerCase()}</Button>}</PermissionGate><Button variant="outline" size="sm" asChild><Link href={`/admin/pedidos/${order.id}`}>Detalle <ArrowRight /></Link></Button></div></CardContent></Card>; })}</div>}
    </div>
  );
}
