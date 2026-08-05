"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { productInputSchema } from "@/lib/validation/catalog";
import type { Product, ProductInput } from "@/types/catalog";

const emptyProduct: ProductInput = { name: "", description: "", price: 0, image: "", category: "granizado", availableFlavors: [], availableAddOns: [], stock: 0, active: true, featured: false };

export function ProductForm({ product }: { product?: Product }) {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProductInput>(product ? { ...product } : emptyProduct);
  const [flavors, setFlavors] = useState(product?.availableFlavors.join(", ") ?? "");
  const [addOns, setAddOns] = useState(product?.availableAddOns.map((item) => `${item.name}:${item.price}`).join(", ") ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const input: ProductInput = {
      ...form,
      availableFlavors: flavors.split(",").map((item) => item.trim()).filter(Boolean),
      availableAddOns: addOns.split(",").map((item) => { const [name, price] = item.split(":"); return { name: name?.trim() ?? "", price: Number(price) }; }).filter((item) => item.name),
    };
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisa los datos del producto."); return; }
    if (!user) return;
    setSaving(true);
    try {
      const response = await fetch(product ? `/api/admin/productos/${encodeURIComponent(product.id)}` : "/api/admin/productos", {
        method: product ? "PATCH" : "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar el producto.");
      router.push("/admin/productos");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="product-name">Nombre</Label><Input id="product-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
      <div className="space-y-2"><Label htmlFor="product-price">Precio</Label><Input id="product-price" type="number" min="1" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} required /></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor="product-description">Descripción</Label><Textarea id="product-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></div>
      <div className="space-y-2"><Label htmlFor="product-image">Imagen (URL permitida)</Label><Input id="product-image" type="url" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} required /></div>
      <div className="space-y-2"><Label htmlFor="product-category">Categoría</Label><select id="product-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ProductInput["category"] })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="granizado">Granizado</option><option value="cocktail">Cóctel</option><option value="special">Especial</option></select></div>
      <div className="space-y-2"><Label htmlFor="product-stock">Stock</Label><Input id="product-stock" type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} /></div>
      <div className="space-y-2"><Label htmlFor="product-flavors">Sabores (separados por coma)</Label><Input id="product-flavors" value={flavors} onChange={(event) => setFlavors(event.target.value)} /></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor="product-addons">Adiciones (nombre:precio, separados por coma)</Label><Input id="product-addons" value={addOns} onChange={(event) => setAddOns(event.target.value)} placeholder="Cereza:2000, Limón:1000" /></div>
    </div>
    <div className="flex flex-wrap gap-5 text-sm">
      <label htmlFor="product-active" className="flex items-center gap-2"><input id="product-active" type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Producto activo</label>
      <label htmlFor="product-featured" className="flex items-center gap-2"><input id="product-featured" type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Destacado</label>
    </div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar producto"}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button></div>
  </form>;
}
