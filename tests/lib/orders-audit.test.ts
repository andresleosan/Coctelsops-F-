import { beforeEach, describe, expect, it, vi } from "vitest";

const { collection, runTransaction, transactionCreate, getProductById, createNotification } = vi.hoisted(() => ({
  collection: vi.fn(),
  runTransaction: vi.fn(),
  transactionCreate: vi.fn(),
  getProductById: vi.fn(),
  createNotification: vi.fn(),
}));

const orderReference = { id: "pedido-1" };
const auditReference = { id: "auditoria-1" };

vi.mock("@/lib/firebase-admin", () => ({ getAdminDb: () => ({ collection, runTransaction }) }));
vi.mock("@/lib/firestore/products", () => ({ getProductById }));
vi.mock("@/lib/firestore/notifications", () => ({ createNotification }));

import { createOrder } from "@/lib/firestore/orders";

describe("auditoría de creación de pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collection.mockImplementation((name: string) => name === "pedidos" ? { doc: () => orderReference } : { doc: () => auditReference });
    runTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({ create: transactionCreate, update: vi.fn(), get: vi.fn() }));
    getProductById.mockResolvedValue({ id: "fresa", name: "Fresa", description: "", price: 10000, image: "https://picsum.photos/seed/fresa/600/600", category: "granizado", availableFlavors: [], availableAddOns: [], stock: 10, active: true, featured: false });
    createNotification.mockResolvedValue("notification-1");
  });

  it("no escribe promotionCode undefined en la auditoría sin promoción", async () => {
    await createOrder({ uid: "customer-1" } as never, {
      customerName: "Ana Perez",
      phone: "324 555 0000",
      address: "Carrera 37 # 66-36",
      items: [{ productId: "fresa", quantity: 1, customization: { size: "Medium", flavors: [], addOns: [] } }],
    });

    const auditPayload = transactionCreate.mock.calls.find(([reference]) => reference === auditReference)?.[1] as { changes?: Record<string, unknown> };
    expect(auditPayload.changes).not.toHaveProperty("promotionCode");
  });
});
