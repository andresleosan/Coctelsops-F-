import type { Permission } from "@/types/auth";

export type AdminNavigationItem = {
  href: string;
  label: string;
  permission?: Permission;
};

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  { href: "/admin/dashboard", label: "Resumen" },
  { href: "/admin/pedidos", label: "Pedidos", permission: "pedidos.read" },
  { href: "/admin/productos", label: "Productos", permission: "productos.read" },
  { href: "/admin/categorias", label: "Categorías", permission: "categorias.read" },
  { href: "/admin/clientes", label: "Clientes", permission: "clientes.read" },
  { href: "/admin/usuarios", label: "Usuarios", permission: "usuarios.read" },
  { href: "/admin/roles", label: "Roles", permission: "roles.read" },
];

export function getVisibleAdminNavigation(isAdmin: boolean, permissions: Permission[]): AdminNavigationItem[] {
  if (isAdmin) return ADMIN_NAVIGATION;
  const assigned = new Set(permissions.filter((permission) => ADMIN_NAVIGATION.some((item) => item.permission === permission)));
  if (assigned.size === 0) return [];
  return ADMIN_NAVIGATION.filter((item) => !item.permission || assigned.has(item.permission));
}
