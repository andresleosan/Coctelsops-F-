"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { PermissionGate } from "@/components/admin/PermissionGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { buildWhatsAppMessage } from "@/lib/orders/whatsapp-message";
import { getOrderAction } from "@/lib/orders/status-actions";
import type { StoreConfiguration } from "@/types/operations";
import type { Order } from "@/types/orders";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [businessPhone, setBusinessPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function loadOrder() {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/pedidos/${encodeURIComponent(id)}?view=admin`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => ({})) as { order?: Order; error?: string };
      if (!response.ok || !body.order) throw new Error(body.error ?? "No se pudo cargar el pedido.");
      setOrder(body.order);
      try {
        const configurationResponse = await fetch("/api/configuration");
        if (configurationResponse.ok) {
          const configurationBody = await configurationResponse.json() as { configuration?: StoreConfiguration };
          setBusinessPhone(configurationBody.configuration?.whatsappNumber ?? "");
        }
      } catch { /* The order remains usable when business configuration is temporarily unavailable. */ }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el pedido.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadOrder(); }, [id, user]);

  async function advanceOrder() {
    if (!order || !user) return;
    const action = getOrderAction(order.status);
    if (!action || !window.confirm(`¿Confirmas el cambio a ${action.nextStatus.replace("_", " ")}?`)) return;
    setUpdating(true); setError("");
    try {
      const response = await fetch(`/api/pedidos/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ status: action.nextStatus }) });
      const body = await response.json().catch(() => ({})) as { order?: Order; error?: string };
      if (!response.ok || !body.order) throw new Error(body.error ?? "No se pudo actualizar el pedido.");
      setOrder(body.order);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el pedido."); }
    finally { setUpdating(false); }
  }

  return (
    <AdminGuard permission="pedidos.read">
      <div className="space-y-6">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900"><ArrowLeft className="h-4 w-4" /> Volver a pedidos</Link>
        {loading ? <div className="h-80 animate-pulse rounded-xl bg-white" /> : error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}<Button variant="outline" size="sm" className="ml-3 border-red-300 bg-white" onClick={() => void loadOrder()}>Reintentar</Button></div> : order && <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Detalle de pedido</p><h1 className="mt-2 text-3xl font-bold text-slate-950">#{order.id}</h1><p className="mt-1 text-sm text-slate-500">Creado {new Date(order.createdAt).toLocaleString("es-CO")}</p></div><div className="flex gap-2"><PermissionGate permission="pedidos.update">{getOrderAction(order.status) && <Button onClick={() => void advanceOrder()} disabled={updating}><CheckCircle2 /> {updating ? "Guardando..." : getOrderAction(order.status)?.label.toLocaleLowerCase()}</Button>}</PermissionGate>{businessPhone && <Button variant="outline" asChild><a href={buildWhatsAppMessage(order, businessPhone)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button>}</div></div>
          <div className="grid gap-4 lg:grid-cols-3"><Card className="border-slate-200 bg-white shadow-sm lg:col-span-2"><CardHeader><CardTitle className="text-lg">Productos</CardTitle></CardHeader><CardContent className="space-y-3">{order.items.map((item) => <div key={item.productId} className="flex justify-between border-b border-slate-100 pb-3 text-sm"><span>{item.quantity} × {item.name}</span><span className="font-semibold">${item.subtotal.toLocaleString("es-CO")}</span></div>)}<div className="flex justify-between pt-2 font-bold"><span>Total</span><span>${order.total.toLocaleString("es-CO")}</span></div></CardContent></Card><Card className="border-slate-200 bg-white shadow-sm"><CardHeader><CardTitle className="text-lg">Entrega</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><strong>Cliente:</strong> {order.customerName}</p><p><strong>Teléfono:</strong> {order.phone}</p><p><strong>Dirección:</strong> {order.address}</p>{order.notes && <p><strong>Notas:</strong> {order.notes}</p>}</CardContent></Card></div>
        </>}
      </div>
    </AdminGuard>
  );
}
