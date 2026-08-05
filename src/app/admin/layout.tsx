"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Permission } from "@/types/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/admin/login") return children;

  const requiredPermission: Permission | undefined = pathname.startsWith("/admin/pedidos") ? "pedidos.read" : undefined;

  return (
    <AdminGuard permission={requiredPermission}>
      <div className="min-h-[calc(100svh-1rem)] bg-slate-100 text-slate-900">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[18rem] border-slate-700 bg-[#111827] p-0 [&>button]:hidden">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex min-h-[calc(100svh-1rem)]">
          <div className="hidden w-64 shrink-0 md:block"><AppSidebar /></div>
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
              <Button variant="outline" size="icon" className="border-slate-200 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
              <Breadcrumbs />
            </header>
            <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
