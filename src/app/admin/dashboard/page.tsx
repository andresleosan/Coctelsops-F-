"use client";

import Link from "next/link";
import { RefreshCw, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { StatsCards, type AdminStats } from "@/components/admin/StatsCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Order } from "@/types/orders";

type StatsResponse = { stats: AdminStats };
type OrdersResponse = { orders: Order[] };

function statusLabel(status: Order["status"]): string {
  return status.replace("_", " ");
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [statsResponse, ordersResponse] = await Promise.all([fetch("/api/admin/stats", { headers }), fetch("/api/pedidos", { headers })]);
      if (!statsResponse.ok || !ordersResponse.ok) {
        const body = await (statsResponse.ok ? ordersResponse : statsResponse).json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "No se pudieron cargar los datos operativos.");
      }
      const statsBody = await statsResponse.json() as StatsResponse;
      const ordersBody = await ordersResponse.json() as OrdersResponse;
      setStats(statsBody.stats);
      setOrders(ordersBody.orders.slice(0, 6));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los datos operativos.");
      setStats(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <AdminGuard>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Centro de control</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Resumen operativo</h1><p className="mt-2 text-sm text-slate-500">Una vista rápida de la actividad de tu tienda.</p></div>
          <Button variant="outline" onClick={() => void loadDashboard()} disabled={loading} className="w-full border-slate-300 bg-white sm:w-auto"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar</Button>
        </div>
        {error && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button variant="outline" size="sm" className="border-red-300 bg-white" onClick={() => void loadDashboard()}>Reintentar</Button></div>}
        <StatsCards stats={stats} loading={loading} />
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-lg text-slate-900">Pedidos recientes</CardTitle><p className="mt-1 text-sm text-slate-500">Sigue el flujo de preparación y entrega.</p></div><Link href="/admin/pedidos" className="flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-900">Ver todos <ArrowRight className="h-4 w-4" /></Link></CardHeader>
          <CardContent>
            {loading ? <div className="space-y-3"><div className="h-12 animate-pulse rounded-lg bg-slate-100" /><div className="h-12 animate-pulse rounded-lg bg-slate-100" /></div> : orders.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">Aún no hay pedidos para mostrar.</div> : <div className="divide-y divide-slate-100">{orders.map((order) => <Link key={order.id} href={`/admin/pedidos/${order.id}`} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-800">{order.customerName}</p><p className="text-xs text-slate-500">#{order.id.slice(0, 8)} · {order.items.length} productos</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><Badge variant="outline" className="capitalize">{statusLabel(order.status)}</Badge><span className="font-semibold text-slate-800">${order.total.toLocaleString("es-CO")}</span></div></Link>)}</div>}
          </CardContent>
        </Card>
        {stats && <p className="text-right text-sm text-slate-500">Ingresos registrados: <span className="font-semibold text-slate-800">${stats.revenue.toLocaleString("es-CO")}</span></p>}
      </div>
    </AdminGuard>
  );
}
