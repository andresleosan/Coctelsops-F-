import { beforeEach, describe, expect, it, vi } from "vitest";

const { collection, runTransaction, transactionCreate, transactionUpdate, transactionGet, getProductById, productFromData } = vi.hoisted(() => ({
  collection: vi.fn(),
  runTransaction: vi.fn(),
  transactionCreate: vi.fn(),
  transactionUpdate: vi.fn(),
  transactionGet: vi.fn(),
  getProductById: vi.fn(),
  productFromData: vi.fn(),
}));

const references = {
  pedidos: { id: "pedido-stable" },
  productos: { id: "fresa" },
  promociones: { id: "promo-1" },
  inventario_movimientos: { id: "movimiento-1" },
  auditoria: { id: "auditoria-1" },
  notificaciones: { id: "notificacion-1" },
};

vi.mock("@/lib/firebase-admin", () => ({ getAdminDb: () => ({ collection, runTransaction }) }));
vi.mock("@/lib/firestore/products", () => ({ getProductById, productFromData }));

import { createOrder } from "@/lib/firestore/orders";

const input = {
  customerName: "Ana Perez",
  phone: "324 555 0000",
  address: "Carrera 37 # 66-36",
  items: [{ productId: "fresa", quantity: 2, customization: { size: "Medium" as const, flavors: [], addOns: [] } }],
};

describe("creación transaccional de pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collection.mockImplementation((name: keyof typeof references) => ({ doc: () => references[name] }));
    const product = { id: "fresa", name: "Fresa", description: "", price: 10000, image: "/catalog-placeholder.svg", category: "granizado", availableFlavors: [], availableAddOns: [], stock: 10, active: true, featured: false };
    getProductById.mockResolvedValue(product);
    productFromData.mockReturnValue(product);
    transactionGet.mockImplementation(async (reference: { id: string }) => reference === references.pedidos
      ? { exists: false, data: () => undefined }
      : { exists: true, data: () => product });
    runTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
      create: transactionCreate,
      update: transactionUpdate,
      get: transactionGet,
    }));
  });

  it("vuelve a leer productos, descuenta stock y escribe pedido, movimiento, auditoría y notificación dentro de la transacción", async () => {
    await createOrder({ uid: "customer-1" } as never, input, { idempotencyKey: "checkout-attempt-1" });

    expect(transactionGet).toHaveBeenCalledWith(references.pedidos);
    expect(transactionGet).toHaveBeenCalledWith(references.productos);
    expect(transactionUpdate).toHaveBeenCalledWith(references.productos, expect.objectContaining({ stock: 8 }));
    expect(transactionCreate).toHaveBeenCalledWith(references.inventario_movimientos, expect.objectContaining({ type: "salida", quantity: 2 }));
    expect(transactionCreate.mock.calls.some(([, data]) => data.module === "inventario")).toBe(true);
    expect(transactionCreate.mock.calls.some(([, data]) => data.audience === "admin" && data.orderId === "pedido-stable")).toBe(true);
  });

  it("recalcula el precio con el producto transaccional y rechaza stock agotado concurrentemente", async () => {
    const staleProduct = { id: "fresa", name: "Fresa", description: "", price: 10000, image: "/catalog-placeholder.svg", category: "granizado", availableFlavors: [], availableAddOns: [], stock: 10, active: true, featured: false };
    const currentProduct = { ...staleProduct, price: 12000, stock: 1 };
    getProductById.mockResolvedValue(staleProduct);
    productFromData.mockReturnValue(currentProduct);

    await expect(createOrder({ uid: "customer-1" } as never, input, { idempotencyKey: "checkout-attempt-2" })).rejects.toThrow(/stock/i);
    expect(transactionUpdate).not.toHaveBeenCalled();
    expect(transactionCreate).not.toHaveBeenCalled();

    productFromData.mockReturnValue({ ...currentProduct, stock: 10 });
    const order = await createOrder({ uid: "customer-1" } as never, input, { idempotencyKey: "checkout-attempt-3" });
    const orderPayload = transactionCreate.mock.calls.find(([reference]) => reference === references.pedidos)?.[1] as { items: Array<{ unitPrice: number }>; total: number };
    expect(order.id).toBe("pedido-stable");
    expect(orderPayload.items[0].unitPrice).toBe(12000);
    expect(orderPayload.total).toBe(24000);
  });

  it("reusa el mismo límite idempotente sin crear otro pedido al reintentar", async () => {
    await createOrder({ uid: "customer-1" } as never, input, { idempotencyKey: "checkout-attempt-1" });
    const firstCreateCount = transactionCreate.mock.calls.length;
    transactionGet.mockImplementation(async (reference: { id: string }) => reference === references.pedidos
      ? { exists: true, data: () => ({ idempotencyKey: "checkout-attempt-1", clienteUid: "customer-1", customerName: "Ana Perez", phone: "324 555 0000", address: "Carrera 37 # 66-36", items: [], subtotal: 20000, total: 20000, status: "pendiente", createdAt: "2026-08-04T00:00:00.000Z", updatedAt: "2026-08-04T00:00:00.000Z", audit: { createdByUid: "customer-1", createdAt: "2026-08-04T00:00:00.000Z" } }) }
      : { exists: true, data: () => ({}) });

    const retry = await createOrder({ uid: "customer-1" } as never, input, { idempotencyKey: "checkout-attempt-1" });

    expect(retry.id).toBe("pedido-stable");
    expect(transactionCreate).toHaveBeenCalledTimes(firstCreateCount);
  });
});
