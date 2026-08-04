import { describe, expect, it } from "vitest";

import { canAccessAdmin } from "@/components/admin/permission-check";

describe("staff permission guards", () => {
  it("allows staff with the requested assigned permission", () => {
    expect(canAccessAdmin({ isAdmin: false, permissions: ["pedidos.read"], permission: "pedidos.read" })).toBe(true);
  });

  it("denies a customer without administrative permissions", () => {
    expect(canAccessAdmin({ isAdmin: false, permissions: [], permission: "pedidos.read" })).toBe(false);
  });

  it("allows the strict claim to elevate an administrative guard", () => {
    expect(canAccessAdmin({ isAdmin: true, permissions: [], permission: "pedidos.read" })).toBe(true);
  });
});
