"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { ProductForm } from "@/components/admin/ProductForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Product } from "@/types/catalog";

export default function EditProductPage() { const { id } = useParams<{ id: string }>(); const { user } = useAuth(); const [product, setProduct] = useState<Product>(); const [error, setError] = useState(""); useEffect(() => { if (!user) return; void user.getIdToken().then((token) => fetch(`/api/admin/productos/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } })).then(async (response) => { const body = await response.json() as { product?: Product; error?: string }; if (!response.ok) throw new Error(body.error ?? "No se pudo cargar el producto."); setProduct(body.product); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el producto.")); }, [id, user]); return <AdminGuard permission="productos.write"><Card className="border-slate-200 bg-white shadow-sm"><CardHeader><CardTitle>Editar producto</CardTitle></CardHeader><CardContent>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : product ? <ProductForm product={product} /> : <div className="h-48 animate-pulse rounded-lg bg-slate-100" />}</CardContent></Card></AdminGuard>; }
