"use client";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewCategoryPage() { return <AdminGuard permission="categorias.write"><Card className="border-slate-200 bg-white shadow-sm"><CardHeader><CardTitle>Nueva categoría</CardTitle></CardHeader><CardContent><CategoryForm /></CardContent></Card></AdminGuard>; }
