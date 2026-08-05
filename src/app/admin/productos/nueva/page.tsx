"use client";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { ProductForm } from "@/components/admin/ProductForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewProductPage() { return <AdminGuard permission="productos.write"><Card className="border-slate-200 bg-white shadow-sm"><CardHeader><CardTitle>Nuevo producto</CardTitle></CardHeader><CardContent><ProductForm /></CardContent></Card></AdminGuard>; }
