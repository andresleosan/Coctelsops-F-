import type { Permission } from "@/types/auth";

export function canAccessAdmin(input: { isAdmin: boolean; permissions: Permission[]; permission?: Permission }): boolean {
  if (input.isAdmin) return true;
  return input.permission ? input.permissions.includes(input.permission) : input.permissions.length > 0;
}
