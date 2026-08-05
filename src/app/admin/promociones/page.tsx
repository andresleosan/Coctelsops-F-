"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { PermissionGate } from "@/components/admin/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import type { Promotion } from "@/types/operations";

const blank = { code: "", startsAt: "", endsAt: "", discountType: "percent", discountValue: "", minimumSubtotal: "0", maxDiscount: "", usageLimit: "", productIds: "", categoryIds: "", active: true };

export default function PromotionsPage() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/promotions", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const body = await response.json() as { promotions?: Promotion[]; error?: string };
      if (!response.ok) throw new Error(body.error);
      setPromotions(body.promotions ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las promociones."); }
    finally { setLoading(false); }
  }

  // The request is intentionally refreshed when the authenticated user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [user]);

  async function create(event: React.FormEvent) {
    event.preventDefault(); if (!user) return;
    try {
      const response = await fetch("/api/admin/promotions", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ code: form.code, active: form.active, startsAt: `${form.startsAt}T00:00:00.000Z`, endsAt: `${form.endsAt}T23:59:59.999Z`, discountType: form.discountType, discountValue: Number(form.discountValue), minimumSubtotal: Number(form.minimumSubtotal), maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined, usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined, productIds: form.productIds.split(",").map((value) => value.trim()).filter(Boolean), categoryIds: form.categoryIds.split(",").map((value) => value.trim()).filter(Boolean) }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setForm(blank); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la promoción."); }
  }

  async function remove(id: string) {
    if (!user || !window.confirm("¿Eliminar esta promoción?")) return;
    const response = await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
    if (!response.ok) setError("No se pudo eliminar la promoción."); else await load();
  }

  return (
    <AdminGuard permission="promociones.read">
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Ventas</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Promociones</h1><p className="mt-1 text-sm text-slate-500">Fechas, alcance, límites y topes se validan en servidor.</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw /> Actualizar</Button></header>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <PermissionGate permission="promociones.write"><Card><CardHeader><CardTitle className="text-lg">Nueva promoción</CardTitle></CardHeader><CardContent><form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><Label htmlFor="promoCode">Código</Label><Input id="promoCode" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required /></div><div><Label htmlFor="promoStart">Inicio</Label><Input id="promoStart" type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></div><div><Label htmlFor="promoEnd">Fin</Label><Input id="promoEnd" type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required /></div><div><Label htmlFor="promoType">Descuento</Label><select id="promoType" value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="percent">Porcentaje</option><option value="fixed">Valor fijo</option></select></div><div><Label htmlFor="promoValue">Valor</Label><Input id="promoValue" type="number" min="0.01" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} required /></div><div><Label htmlFor="promoMinimum">Compra mínima</Label><Input id="promoMinimum" type="number" min="0" value={form.minimumSubtotal} onChange={(event) => setForm({ ...form, minimumSubtotal: event.target.value })} required /></div><div><Label htmlFor="promoCap">Tope opcional</Label><Input id="promoCap" type="number" min="0.01" value={form.maxDiscount} onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })} /></div><div><Label htmlFor="promoLimit">Límite de usos</Label><Input id="promoLimit" type="number" min="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="promoProducts">Productos (IDs separados por coma)</Label><Input id="promoProducts" value={form.productIds} onChange={(event) => setForm({ ...form, productIds: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="promoCategories">Categorías (IDs separados por coma)</Label><Input id="promoCategories" value={form.categoryIds} onChange={(event) => setForm({ ...form, categoryIds: event.target.value })} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activa</label><Button type="submit" className="sm:col-span-2 lg:col-span-4 lg:w-fit"><Plus /> Crear promoción</Button></form></CardContent></Card></PermissionGate>
        <Card><CardHeader><CardTitle className="text-lg">Promociones registradas</CardTitle></CardHeader><CardContent>{loading ? <div className="h-32 animate-pulse rounded-lg bg-slate-100" /> : promotions.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No hay promociones registradas.</p> : <div className="grid gap-3">{promotions.map((promotion) => <div key={promotion.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{promotion.code}</strong><Badge variant={promotion.active ? "default" : "secondary"}>{promotion.active ? "Activa" : "Inactiva"}</Badge></div><p className="mt-1 text-sm text-slate-500">{promotion.discountType === "percent" ? `${promotion.discountValue}%` : `$${promotion.discountValue.toLocaleString("es-CO")}`} · mínimo ${promotion.minimumSubtotal.toLocaleString("es-CO")} · usos {promotion.usageCount}{promotion.usageLimit ? `/${promotion.usageLimit}` : ""}</p><p className="mt-1 text-xs text-slate-500">Alcance: {promotion.productIds?.length ? `productos ${promotion.productIds.join(", ")}` : promotion.categoryIds?.length ? `categorías ${promotion.categoryIds.join(", ")}` : "todos los productos"}</p></div><PermissionGate permission="promociones.write"><Button variant="destructive" size="sm" onClick={() => void remove(promotion.id)}><Trash2 /> Eliminar</Button></PermissionGate></div>)}</div>}</CardContent></Card>
      </div>
    </AdminGuard>
  );
}
