import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

const adminGuard = readFileSync("src/components/admin/AdminGuard.tsx", "utf8");
const permissionGate = readFileSync("src/components/admin/PermissionGate.tsx", "utf8");
const dashboard = readFileSync("src/app/admin/dashboard/page.tsx", "utf8");

describe("admin guard contract", () => {
  it("requires the strict auth claim in both client guards", () => {
    expect(adminGuard).toContain("isAdmin");
    expect(permissionGate).toContain("isAdmin");
    expect(adminGuard).not.toContain('data.user?.accountType === "admin"');
    expect(permissionGate).not.toContain('data.user?.accountType === "admin"');
  });

  it("protects the existing admin route without changing its order behavior", () => {
    expect(dashboard).toContain("<AdminGuard>");
  });
});
