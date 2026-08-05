import { describe, expect, it } from "vitest";

import { canManageRoleAssignments, getAdminDataScopes } from "@/components/admin/admin-data-scope";

describe("admin data permission scopes", () => {
  it("does not request unassigned order or customer data for product-only staff", () => {
    expect(getAdminDataScopes(false, ["productos.read"])).toEqual(["products"]);
  });

  it("requests only order data for order-only staff", () => {
    expect(getAdminDataScopes(false, ["pedidos.read"])).toEqual(["orders"]);
  });

  it("allows administrators to use every dashboard scope", () => {
    expect(getAdminDataScopes(true, [])).toEqual(["orders", "products", "customers"]);
  });

  it("only enables role assignment for staff with both management permissions", () => {
    expect(canManageRoleAssignments(false, ["usuarios.manage", "roles.read"])).toBe(true);
    expect(canManageRoleAssignments(false, ["usuarios.manage"])).toBe(false);
    expect(canManageRoleAssignments(false, [])).toBe(false);
    expect(canManageRoleAssignments(true, [])).toBe(true);
  });
});
