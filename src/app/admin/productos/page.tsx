"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { PermissionGate } from "@/components/admin/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Product } from "@/types/catalog";

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { if (!user) return; setLoading(true); setError(""); try { const response = await fetch("/api/admin/productos", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }); const body = await response.json().catch(() => ({})) as { products?: Product[]; error?: string }; if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los productos."); setProducts(body.products ?? []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los productos."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [user]);
  async function remove(product: Product) { if (!user || !window.confirm(`¿Eliminar ${product.name}? Esta acción no se puede deshacer.`)) return; const response = await fetch(`/api/admin/productos/${encodeURIComponent(product.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await user.getIdToken()}` } }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; setError(body.error ?? "No se pudo eliminar el producto."); return; } setProducts((items) => items.filter((item) => item.id !== product.id)); }
  return <AdminGuard permission="productos.read"><div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Catálogo</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Productos</h1></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Actualizar</Button><PermissionGate permission="productos.write"><Button asChild><Link href="/admin/productos/nueva"><Plus /> Nuevo producto</Link></Button></PermissionGate></div></div>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}{loading ? <div className="h-48 animate-pulse rounded-xl bg-white" /> : products.length === 0 ? <Card className="border-dashed bg-white"><CardContent className="p-10 text-center text-sm text-slate-500">No hay productos registrados.</CardContent></Card> : <div className="grid gap-3">{products.map((product) => <Card key={product.id} className="border-slate-200 bg-white shadow-sm"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{product.name}</h2><Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Activo" : "Inactivo"}</Badge>{product.featured && <Badge variant="outline">Destacado</Badge>}</div><p className="mt-1 text-sm text-slate-500">{product.category} · ${product.price.toLocaleString("es-CO")} · stock {product.stock}</p></div><PermissionGate permission="productos.write"><div className="flex gap-2"><Button variant="outline" size="sm" asChild><Link href={`/admin/productos/${product.id}`}><Pencil /> Editar</Link></Button><Button variant="destructive" size="sm" onClick={() => void remove(product)}><Trash2 /> Eliminar</Button></div></PermissionGate></CardContent></Card>)}</div>}</div></AdminGuard>;
}
