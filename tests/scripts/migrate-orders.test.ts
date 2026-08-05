import { describe, expect, it } from "vitest";

import {
  mapLegacyOrder,
  migrateLegacyOrders,
  verifyMigration,
  type LegacyOrder,
} from "../../scripts/migrate-orders";

const legacyOrder: LegacyOrder = {
  customerName: "Ana Perez",
  phone: "324 555 0000",
  address: "Carrera 37 # 66-36",
  notes: "Piso 3",
  items: [{ name: "Fresa", quantity: 2, price: 7500, customization: { size: "Medium", flavors: [], addOns: [] } }],
  total: 15000,
  status: "En Camino",
  createdAt: "2026-08-01T10:00:00.000Z",
};

describe("migración de pedidos históricos", () => {
  it("mapea los campos legados y conserva el snapshot de items", () => {
    const order = mapLegacyOrder("legacy-1", legacyOrder);

    expect(order).toMatchObject({
      id: "legacy-1",
      customerName: "Ana Perez",
      phone: "324 555 0000",
      address: "Carrera 37 # 66-36",
      notes: "Piso 3",
      total: 15000,
      subtotal: 15000,
      status: "en_camino",
      createdAt: "2026-08-01T10:00:00.000Z",
      clienteUid: "",
      legacy: true,
      historical: true,
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      name: "Fresa",
      quantity: 2,
      price: 7500,
      unitPrice: 7500,
      subtotal: 15000,
    });
  });

  it("conserva el cliente y traduce los estados legados conocidos", () => {
    const order = mapLegacyOrder("legacy-2", { ...legacyOrder, clienteUid: "customer-1", status: "Pendiente" });

    expect(order.clienteUid).toBe("customer-1");
    expect(order.historical).toBe(false);
    expect(order.status).toBe("pendiente");
  });

  it("migra una sola vez, conserva orders y reporta omitidos y fallos", async () => {
    const source = new Map([
      ["legacy-1", legacyOrder],
      ["legacy-2", { ...legacyOrder, total: 20000 }],
    ]);
    const target = new Map<string, Record<string, unknown>>([
      ["legacy-2", mapLegacyOrder("legacy-2", source.get("legacy-2") as LegacyOrder)],
    ]);
    const db = fakeDb(source, target);

    const firstRun = await migrateLegacyOrders({ db });
    const secondRun = await migrateLegacyOrders({ db });

    expect(firstRun).toMatchObject({ total: 2, migrated: 1, skipped: 1, failed: 0 });
    expect(secondRun).toMatchObject({ total: 2, migrated: 0, skipped: 2, failed: 0 });
    expect(source.size).toBe(2);
    expect(target.get("legacy-1")).toMatchObject({ total: 15000, legacy: true, historical: true });
  });

  it("detecta diferencias de ids, totales, items y estados", async () => {
    const source = new Map([["legacy-1", legacyOrder]]);
    const target = new Map<string, Record<string, unknown>>([
      ["legacy-1", { ...mapLegacyOrder("legacy-1", legacyOrder), total: 1 }],
    ]);

    const result = await verifyMigration({ db: fakeDb(source, target) });

    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual(expect.arrayContaining([expect.objectContaining({ id: "legacy-1", field: "total" })]));
  });
});

function fakeDb(source: Map<string, LegacyOrder>, target: Map<string, Record<string, unknown>>) {
  const sourceCollection = {
    get: async () => ({ docs: [...source.entries()].map(([id, data]) => ({ id, data: () => data })) }),
    doc: () => { throw new Error("La fuente no admite escrituras"); },
  };
  const targetCollection = {
    get: async () => ({ docs: [...target.entries()].map(([id, data]) => ({ id, data: () => data })) }),
    doc: (id: string) => ({
      get: async () => ({ exists: target.has(id), data: () => target.get(id) }),
      set: async (data: Record<string, unknown>) => { target.set(id, data); },
    }),
  };
  return {
    collection: (name: string) => name === "orders" ? sourceCollection : targetCollection,
  };
}
