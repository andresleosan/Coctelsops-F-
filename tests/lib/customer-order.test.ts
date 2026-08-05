import { describe, expect, it } from "vitest";

import { toCustomerOrder } from "@/lib/orders/customer-order";
import type { Order } from "@/types/orders";

describe("toCustomerOrder", () => {
  it("removes admin audit data and actor ids while preserving order snapshots", () => {
    const order: Order = {
      id: "pedido-1",
      clienteUid: "customer-1",
      customerName: "Cliente",
      phone: "324 555 0000",
      address: "Carrera 1 # 2-3",
      items: [{
        productId: "granizado",
        name: "Granizado de fresa",
        quantity: 1,
        unitPrice: 12000,
        subtotal: 12000,
        customization: { size: "Medium", flavors: [], addOns: [] },
      }],
      subtotal: 12000,
      total: 12000,
      status: "confirmado",
      createdAt: "2026-08-04T10:00:00.000Z",
      updatedAt: "2026-08-04T10:10:00.000Z",
      audit: { createdByUid: "customer-1", createdAt: "2026-08-04T10:00:00.000Z", updatedByUid: "staff-1" },
      statusHistory: [
        { status: "pendiente", actorUid: "customer-1", at: "2026-08-04T10:00:00.000Z" },
        { status: "confirmado", actorUid: "staff-1", at: "2026-08-04T10:10:00.000Z", reason: "Listo" },
      ],
    };

    const customerOrder = toCustomerOrder(order);

    expect(customerOrder).not.toHaveProperty("audit");
    expect(customerOrder).not.toHaveProperty("clienteUid");
    expect(customerOrder.statusHistory).toEqual([
      { status: "pendiente", at: "2026-08-04T10:00:00.000Z" },
      { status: "confirmado", at: "2026-08-04T10:10:00.000Z", reason: "Listo" },
    ]);
    expect(customerOrder.items[0]).toMatchObject({ name: "Granizado de fresa", unitPrice: 12000 });
  });

  it("preserves a cancellation event timestamp and supplies a legacy fallback", () => {
    const cancelledOrder: Order = {
      id: "pedido-cancelado",
      clienteUid: "customer-1",
      customerName: "Cliente",
      phone: "324 555 0000",
      address: "Carrera 1 # 2-3",
      items: [],
      subtotal: 0,
      total: 0,
      status: "cancelado",
      createdAt: "2026-08-04T10:00:00.000Z",
      updatedAt: "2026-08-04T10:20:00.000Z",
      audit: { createdByUid: "customer-1", createdAt: "2026-08-04T10:00:00.000Z" },
      statusHistory: [
        { status: "pendiente", actorUid: "customer-1", at: "2026-08-04T10:00:00.000Z" },
        { status: "cancelado", actorUid: "staff-1", at: "2026-08-04T10:20:00.000Z", reason: "Sin cobertura" },
      ],
    };

    expect(toCustomerOrder(cancelledOrder).statusHistory).toEqual([
      { status: "pendiente", at: "2026-08-04T10:00:00.000Z" },
      { status: "cancelado", at: "2026-08-04T10:20:00.000Z", reason: "Sin cobertura" },
    ]);

    const legacyOrder = { ...cancelledOrder, statusHistory: undefined };
    expect(toCustomerOrder(legacyOrder).statusHistory).toEqual([{ status: "cancelado", at: "2026-08-04T10:20:00.000Z" }]);
  });
});
