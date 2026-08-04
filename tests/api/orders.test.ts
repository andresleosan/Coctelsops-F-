import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireVerifiedEmail, requirePermission, createOrder, getCustomerOrder, updateOrderStatus } = vi.hoisted(() => ({
  requireVerifiedEmail: vi.fn(),
  requirePermission: vi.fn(),
  createOrder: vi.fn(),
  getCustomerOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock("@/lib/auth/verify-request", () => ({
  requireVerifiedEmail,
  toAuthorizationResponse: (error: Error & { status?: number }) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
}));
vi.mock("@/lib/auth/permissions", () => ({ requirePermission }));
vi.mock("@/lib/firestore/orders", () => ({ createOrder, getCustomerOrder, updateOrderStatus }));

import { POST } from "@/app/api/pedidos/route";
import { GET as GET_BY_ID, PATCH as PATCH_BY_ID } from "@/app/api/pedidos/[id]/route";

describe("secure order APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireVerifiedEmail.mockResolvedValue({ uid: "customer-1" });
    requirePermission.mockResolvedValue({ uid: "staff-1", permissions: ["pedidos.update"] });
    createOrder.mockResolvedValue({ id: "pedido-1", clienteUid: "customer-1", total: 11500, status: "pendiente" });
    getCustomerOrder.mockResolvedValue({ id: "pedido-1", clienteUid: "customer-1" });
    updateOrderStatus.mockResolvedValue({ id: "pedido-1", status: "confirmado" });
  });

  it("requires verified email and never passes client ownership or totals to the domain", async () => {
    const response = await POST(new Request("http://localhost/api/pedidos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerName: "Ana Perez",
        phone: "324 555 0000",
        address: "Carrera 37 # 66-36",
        items: [{ productId: "fresa", quantity: 1, customization: { size: "Medium", flavors: [], addOns: [] }, price: 1 }],
        total: 1,
        status: "entregado",
        clienteUid: "attacker",
      }),
    }));

    expect(response.status).toBe(201);
    expect(requireVerifiedEmail).toHaveBeenCalled();
    expect(createOrder).toHaveBeenCalledWith({ uid: "customer-1" }, expect.objectContaining({ items: [expect.objectContaining({ productId: "fresa" })] }));
    expect(createOrder.mock.calls[0][1]).not.toHaveProperty("total");
    expect(createOrder.mock.calls[0][1]).not.toHaveProperty("clienteUid");
    expect(createOrder.mock.calls[0][1]).not.toHaveProperty("status");
  });

  it("maps validation failures to 422", async () => {
    createOrder.mockRejectedValueOnce(Object.assign(new Error("Carrito vacio"), { name: "ZodError" }));

    const response = await POST(new Request("http://localhost/api/pedidos", { method: "POST", body: "{}" }));

    expect(response.status).toBe(422);
  });

  it("maps malformed JSON to 422", async () => {
    const response = await POST(new Request("http://localhost/api/pedidos", { method: "POST", body: "{" }));

    expect(response.status).toBe(422);
  });

  it("reads an order through the ownership-checked repository", async () => {
    const response = await GET_BY_ID(new Request("http://localhost/api/pedidos/pedido-1"), { params: Promise.resolve({ id: "pedido-1" }) });

    expect(response.status).toBe(200);
    expect(getCustomerOrder).toHaveBeenCalledWith({ uid: "customer-1" }, "pedido-1");
  });

  it("requires pedidos.update for status changes", async () => {
    const response = await PATCH_BY_ID(new Request("http://localhost/api/pedidos/pedido-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "confirmado" }),
    }), { params: Promise.resolve({ id: "pedido-1" }) });

    expect(response.status).toBe(200);
    expect(requirePermission).toHaveBeenCalledWith(expect.anything(), "pedidos.update");
    expect(updateOrderStatus).toHaveBeenCalledWith({ uid: "staff-1", permissions: ["pedidos.update"] }, "pedido-1", { status: "confirmado" });
  });

});
