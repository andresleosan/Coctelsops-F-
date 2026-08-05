"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { Category } from "@/types/catalog";

export default function EditCategoryPage() { const { id } = useParams<{ id: string }>(); const { user } = useAuth(); const [category, setCategory] = useState<Category>(); const [error, setError] = useState(""); useEffect(() => { if (!user) return; void user.getIdToken().then((token) => fetch("/api/admin/categorias", { headers: { Authorization: `Bearer ${token}` } })).then(async (response) => { const body = await response.json() as { categories?: Category[]; error?: string }; if (!response.ok) throw new Error(body.error ?? "No se pudo cargar la categoría."); setCategory(body.categories?.find((item) => item.id === id)); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la categoría.")); }, [id, user]); return <AdminGuard permission="categorias.write"><Card className="border-slate-200 bg-white shadow-sm"><CardHeader><CardTitle>Editar categoría</CardTitle></CardHeader><CardContent>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : category ? <CategoryForm category={category} /> : <div className="h-32 animate-pulse rounded-lg bg-slate-100" />}</CardContent></Card></AdminGuard>; }
