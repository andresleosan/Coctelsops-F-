import { Suspense } from "react";

import AdminLoginContent from "@/components/admin/AdminLoginContent";

export default function AdminLoginPage() {
  return <Suspense fallback={<div className="flex min-h-[calc(100svh-2rem)] items-center justify-center bg-slate-100 text-sm text-slate-500">Cargando acceso...</div>}><AdminLoginContent /></Suspense>;
}
