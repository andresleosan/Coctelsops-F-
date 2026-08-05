"use client";

import { RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { PermissionGate } from "@/components/admin/PermissionGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import type { InventoryMovement, InventoryMovementType } from "@/types/operations";

export default function InventoryPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [form, setForm] = useState({ productId: "", type: "entrada" as InventoryMovementType, quantity: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/inventory", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const body = await response.json() as { movements?: InventoryMovement[]; error?: string };
      if (!response.ok) throw new Error(body.error);
      setMovements(body.movements ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inventario.");
    } finally { setLoading(false); }
  }

  // The request is intentionally refreshed when the authenticated user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [user]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (form.type === "salida" && !window.confirm("¿Confirmas esta salida de inventario?")) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/inventory", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ ...form, quantity: Number(form.quantity) }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setForm({ productId: "", type: "entrada", quantity: "", reason: "" });
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el movimiento."); }
    finally { setSaving(false); }
  }

  return (
    <AdminGuard permission="inventario.read">
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Operaciones</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Inventario</h1><p className="mt-1 text-sm text-slate-500">Cada ajuste registra actor, motivo y stock resultante.</p></div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Actualizar</Button>
        </header>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <PermissionGate permission="inventario.write">
          <Card><CardHeader><CardTitle className="text-lg">Registrar movimiento</CardTitle></CardHeader><CardContent>
            <form onSubmit={save} className="grid gap-4 md:grid-cols-4">
              <div><Label htmlFor="productId">ID del producto</Label><Input id="productId" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} required /></div>
              <div><Label htmlFor="movementType">Tipo</Label><select id="movementType" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as InventoryMovementType })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste firmado</option></select></div>
              <div><Label htmlFor="quantity">Cantidad</Label><Input id="quantity" type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></div>
              <div><Label htmlFor="reason">Motivo</Label><Input id="reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} minLength={3} required /></div>
              <Button type="submit" disabled={saving} className="md:col-span-4 md:w-fit"><Save /> {saving ? "Guardando..." : "Registrar movimiento"}</Button>
            </form>
          </CardContent></Card>
        </PermissionGate>
        <Card><CardHeader><CardTitle className="text-lg">Movimientos recientes</CardTitle></CardHeader><CardContent>
          {loading ? <div className="h-32 animate-pulse rounded-lg bg-slate-100" /> : movements.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">Aún no hay movimientos registrados.</p> : <div className="overflow-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Producto</th><th className="p-3">Tipo</th><th className="p-3">Cambio</th><th className="p-3">Resultado</th><th className="p-3">Motivo</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id} className="border-b"><td className="p-3 font-medium">{movement.productId}</td><td className="p-3 capitalize">{movement.type}</td><td className="p-3">{movement.quantity}</td><td className="p-3">{movement.resultingStock}</td><td className="p-3">{movement.reason}</td></tr>)}</tbody></table></div>}
        </CardContent></Card>
      </div>
    </AdminGuard>
  );
}
