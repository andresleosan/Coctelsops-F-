import { beforeEach, describe, expect, it, vi } from "vitest";

const { requirePermission, listRoles, createRole } = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  listRoles: vi.fn(),
  createRole: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({ requirePermission }));
vi.mock("@/lib/auth/verify-request", () => ({
  toAuthorizationResponse: (error: Error & { status?: number }) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
}));
vi.mock("@/lib/firestore/roles", () => ({ listRoles, createRole, auditRoleMutation: vi.fn() }));

import { GET, POST } from "@/app/api/admin/roles/route";

describe("/api/admin/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue({ uid: "admin-1", profile: { accountType: "admin" } });
    listRoles.mockResolvedValue([{ id: "operaciones", name: "Operaciones", permissions: ["pedidos.read"], active: true }]);
    createRole.mockResolvedValue("operaciones");
  });

  it("requiere el permiso de lectura para listar roles", async () => {
    const response = await GET(new Request("http://localhost/api/admin/roles"));

    expect(response.status).toBe(200);
    expect(requirePermission).toHaveBeenCalledWith(expect.anything(), "roles.read");
    await expect(response.json()).resolves.toEqual({ roles: expect.any(Array) });
  });

  it("crea un rol con permisos explícitos", async () => {
    const response = await POST(new Request("http://localhost/api/admin/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Operaciones", permissions: ["roles.write"], active: true }),
    }));

    expect(response.status).toBe(201);
    expect(createRole).toHaveBeenCalledWith({ name: "Operaciones", description: "", permissions: ["roles.write"], active: true });
  });

  it("rechaza campos de elevación no definidos por el contrato", async () => {
    const response = await POST(new Request("http://localhost/api/admin/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Operaciones", permissions: ["roles.write"], admin: true }),
    }));

    expect(response.status).toBe(422);
  });

  it("devuelve 403 si el permiso de escritura falta", async () => {
    requirePermission.mockRejectedValueOnce(Object.assign(new Error("Prohibido"), { status: 403 }));

    const response = await POST(new Request("http://localhost/api/admin/roles", { method: "POST" }));

    expect(response.status).toBe(403);
  });
});
