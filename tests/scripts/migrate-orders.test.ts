import { describe, expect, it } from "vitest";

import {
  mapLegacyOrder,
  migrateLegacyOrders,
  verifyMigration,
  type LegacyOrder,
  type MigrationDb,
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

  it("conserva timestamps ISO y Timestamp-like válidos", () => {
    const order = mapLegacyOrder("legacy-3", {
      ...legacyOrder,
      createdAt: { seconds: 1785578400, nanoseconds: 0 },
    });

    expect(order.createdAt).toBe("2026-08-01T10:00:00.000Z");
    expect(mapLegacyOrder("legacy-4", legacyOrder).createdAt).toBe(legacyOrder.createdAt);
  });

  it("migra una sola vez, conserva orders y reporta omitidos y fallos", async () => {
    const source = new Map([
      ["legacy-1", legacyOrder],
      ["legacy-2", { ...legacyOrder, total: 20000 }],
    ]);
    const target = new Map<string, Record<string, unknown>>([
      ["legacy-2", mapLegacyOrder("legacy-2", source.get("legacy-2") as LegacyOrder)],
    ]);
    const existingTarget = target.get("legacy-2");
    const db = fakeDb(source, target);

    const firstRun = await migrateLegacyOrders({ db });
    const secondRun = await migrateLegacyOrders({ db });

    expect(firstRun).toMatchObject({ total: 2, migrated: 1, skipped: 1, failed: 0 });
    expect(secondRun).toMatchObject({ total: 2, migrated: 0, skipped: 2, failed: 0 });
    expect(source.size).toBe(2);
    expect(target.get("legacy-1")).toMatchObject({ total: 15000, legacy: true, historical: true });
    expect(target.get("legacy-2")).toEqual(existingTarget);
  });

  it("no sobrescribe un destino que aparece durante la creación atómica", async () => {
    const source = new Map([["legacy-1", legacyOrder]]);
    const concurrentOrder = { ...mapLegacyOrder("legacy-1", legacyOrder), customerName: "Otro proceso" };
    const target = new Map<string, Record<string, unknown>>([["legacy-1", concurrentOrder]]);

    const summary = await migrateLegacyOrders({ db: fakeDb(source, target, { raceId: "legacy-1" }) });

    expect(summary).toMatchObject({ migrated: 0, skipped: 1, failed: 0 });
    expect(target.get("legacy-1")).toEqual(concurrentOrder);
  });

  it("detecta diferencias profundas aunque total y cantidad de items coincidan", async () => {
    const source = new Map([["legacy-1", legacyOrder]]);
    const target = new Map<string, Record<string, unknown>>([
      ["legacy-1", {
        ...mapLegacyOrder("legacy-1", legacyOrder),
        items: [{ ...mapLegacyOrder("legacy-1", legacyOrder).items[0], name: "Mango" }],
      }],
    ]);

    const result = await verifyMigration({ db: fakeDb(source, target) });

    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual(expect.arrayContaining([expect.objectContaining({ id: "legacy-1", field: "items[0].name" })]));
  });

  it("rechaza un total legado inválido y no crea un pedido corrupto", async () => {
    const source = new Map([["legacy-1", { ...legacyOrder, total: "no-es-un-numero" }]]);
    const target = new Map<string, Record<string, unknown>>();

    const summary = await migrateLegacyOrders({ db: fakeDb(source, target) });

    expect(summary).toMatchObject({ migrated: 0, skipped: 0, failed: 1 });
    expect(summary.errors[0]?.message).toMatch(/total.*número/i);
    expect(target).toHaveLength(0);
  });

  it("rechaza timestamps string malformados y no crea un pedido corrupto", async () => {
    const source = new Map([["legacy-1", { ...legacyOrder, createdAt: "not-a-date" }]]);
    const target = new Map<string, Record<string, unknown>>();

    const summary = await migrateLegacyOrders({ db: fakeDb(source, target) });

    expect(summary).toMatchObject({ migrated: 0, skipped: 0, failed: 1 });
    expect(summary.errors[0]?.message).toMatch(/createdAt.*fecha válida/i);
    expect(target).toHaveLength(0);
  });
});

function fakeDb(source: Map<string, LegacyOrder>, target: Map<string, Record<string, unknown>>, options: { raceId?: string } = {}) {
  const sourceCollection = {
    get: async () => ({ docs: [...source.entries()].map(([id, data]) => ({ id, data: () => data })) }),
    doc: () => { throw new Error("La fuente no admite escrituras"); },
  };
  const targetCollection = {
    get: async () => ({ docs: [...target.entries()].map(([id, data]) => ({ id, data: () => data })) }),
    doc: (id: string) => ({
      id,
      get: async () => ({ exists: target.has(id), data: () => target.get(id) }),
      set: async (data: Record<string, unknown>) => { target.set(id, data); },
    }),
  };
  return {
    collection: (name: string) => name === "orders" ? sourceCollection : targetCollection,
    runTransaction: async (callback: (transaction: { get: (reference: { id?: string; get: () => Promise<unknown> }) => Promise<unknown>; create: (ref: { id?: string; get: () => Promise<unknown> }, data: Record<string, unknown>) => unknown }) => Promise<unknown>) => callback({
      get: async (reference: { id?: string; get: () => Promise<unknown> }) => options.raceId === reference.id ? { exists: false, data: () => undefined } : reference.get(),
      create: (reference: { id?: string; get: () => Promise<unknown> }, data: Record<string, unknown>) => {
        void reference;
        if (reference.id && target.has(reference.id)) {
          throw Object.assign(new Error("Already exists"), { code: 6 });
        }
        target.set(reference.id ?? "", data);
      },
    }),
  } as unknown as MigrationDb;
}
