"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Martini,
  ShieldCheck,
  ShoppingBag,
  Users,
  UserCog,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { logout } from "@/lib/auth-client";
import type { Permission } from "@/types/auth";
import { getVisibleAdminNavigation, ADMIN_NAVIGATION } from "@/components/admin/admin-navigation";

type AppSidebarProps = { onNavigate?: () => void };

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = React.useState<Permission[]>([]);

  React.useEffect(() => {
    if (!user) {
      setPermissions([]);
      return;
    }
    let mounted = true;
    void user.getIdToken().then(async (token) => {
      const response = await fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } });
      if (!mounted || !response.ok) return;
      const data = await response.json() as { user?: { permissions?: Permission[] } };
      setPermissions(data.user?.permissions ?? []);
    }).catch(() => {
      if (mounted) setPermissions([]);
    });
    return () => { mounted = false; };
  }, [user]);

  const visibleItems = getVisibleAdminNavigation(isAdmin, permissions).map((item) => ({
    ...item,
    icon: ADMIN_NAVIGATION.find((candidate) => candidate.href === item.href)?.href === "/admin/dashboard"
      ? LayoutDashboard
      : item.href === "/admin/pedidos"
        ? ClipboardList
        : item.href === "/admin/productos"
          ? Martini
          : item.href === "/admin/categorias"
            ? FolderTree
            : item.href === "/admin/clientes"
              ? Users
              : item.href === "/admin/usuarios"
                ? UserCog
                : ShieldCheck,
  }));

  async function handleLogout() {
    await logout();
    router.replace("/admin/login");
  }

  return (
    <aside className="flex h-full w-full flex-col bg-[#111827] text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-700/80 px-5 py-5">
        <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[0.18em] text-cyan-300">COCTELS</span>
            <span className="block text-[10px] font-semibold tracking-[0.25em] text-slate-400">OPS CONTROL</span>
          </span>
        </Link>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-800 hover:text-white md:hidden" onClick={onNavigate} aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav aria-label="Navegación de administración" className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Operaciones</p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${active ? "bg-cyan-400/15 text-cyan-200" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        {visibleItems.length === 0 && <p className="px-3 text-sm text-slate-400">No tienes módulos asignados.</p>}
      </nav>
      <div className="space-y-3 border-t border-slate-700/80 p-4">
        <Link href="/menu" onClick={onNavigate} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
          <Martini className="h-4 w-4" aria-hidden="true" /> Volver a la tienda
        </Link>
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 px-3 text-slate-300 hover:bg-slate-800 hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
