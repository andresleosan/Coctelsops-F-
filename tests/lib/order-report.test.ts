import { describe, expect, it } from "vitest";

import { aggregateOrders } from "@/lib/reports/order-report";
import type { ReportOrder } from "@/types/operations";

const orders: ReportOrder[] = [
  { id: "1", status: "entregado", total: 20_000, customerId: "a", createdAt: "2026-08-01T10:00:00.000Z", items: [{ name: "Fresa", quantity: 2, subtotal: 20_000 }] },
  { id: "2", status: "cancelado", total: 30_000, customerId: "b", createdAt: "2026-08-02T10:00:00.000Z", items: [{ name: "Mango", quantity: 1, subtotal: 30_000 }] },
  { id: "3", status: "entregado", total: 15_000, customerId: "a", createdAt: "2026-08-03T10:00:00.000Z", items: [{ name: "Fresa", quantity: 1, subtotal: 15_000 }] },
];

describe("reporte agregado de pedidos", () => {
  it("devuelve conteos, ingresos por estado, top productos, clientes y cancelaciones", () => {
    expect(aggregateOrders(orders)).toEqual({
      orderCount: 3,
      totalRevenue: 65_000,
      revenueByStatus: { entregado: 35_000, cancelado: 30_000 },
      topProducts: [{ name: "Fresa", quantity: 3, revenue: 35_000 }, { name: "Mango", quantity: 1, revenue: 30_000 }],
      topCustomers: [{ customerId: "a", orders: 2, revenue: 35_000 }, { customerId: "b", orders: 1, revenue: 30_000 }],
      cancellationCount: 1,
    });
  });
});
