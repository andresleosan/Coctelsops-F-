"use client";

import { useSearchParams } from "next/navigation";
import { Martini, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/admin/dashboard";
  return <main className="flex min-h-[calc(100svh-2rem)] items-center justify-center bg-slate-100 px-4 py-10"><Card className="w-full max-w-md border-slate-200 bg-white shadow-xl"><CardHeader className="space-y-4 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-cyan-300"><Martini className="h-7 w-7" /></div><div><CardTitle className="text-2xl text-slate-900">Acceso operativo</CardTitle><p className="mt-2 text-sm text-slate-500">Ingresa con tu cuenta autorizada de Coctels OPS.</p></div><p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700"><ShieldCheck className="h-4 w-4" /> Acceso protegido</p></CardHeader><CardContent><LoginForm redirectTo={redirectTo} /></CardContent></Card></main>;
}
