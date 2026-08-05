import type { Permission } from "@/types/auth";

export type AdminDataScope = "orders" | "products" | "customers";

export function canManageRoleAssignments(isAdmin: boolean, permissions: Permission[]): boolean {
  return isAdmin || (permissions.includes("usuarios.manage") && permissions.includes("roles.read"));
}

export function getAdminDataScopes(isAdmin: boolean, permissions: Permission[]): AdminDataScope[] {
  if (isAdmin) return ["orders", "products", "customers"];
  return [
    permissions.includes("pedidos.read") ? "orders" : null,
    permissions.includes("productos.read") ? "products" : null,
    permissions.includes("clientes.read") ? "customers" : null,
  ].filter((scope): scope is AdminDataScope => scope !== null);
}
