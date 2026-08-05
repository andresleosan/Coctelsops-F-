import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import type { OrderReport, OrderReportFilter, ReportOrder } from "@/types/operations";

export function aggregateOrders(orders: ReportOrder[]): OrderReport {
  const revenueByStatus: Record<string, number> = {};
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  const customerMap = new Map<string, { orders: number; revenue: number }>();
  let cancellationCount = 0;
  let totalRevenue = 0;
  for (const order of orders) {
    totalRevenue += order.total;
    revenueByStatus[order.status] = (revenueByStatus[order.status] ?? 0) + order.total;
    if (order.status === "cancelado") cancellationCount += 1;
    const customer = customerMap.get(order.customerId) ?? { orders: 0, revenue: 0 };
    customer.orders += 1;
    customer.revenue += order.total;
    customerMap.set(order.customerId, customer);
    for (const item of order.items) {
      const product = productMap.get(item.name) ?? { quantity: 0, revenue: 0 };
      product.quantity += item.quantity;
      product.revenue += item.subtotal;
      productMap.set(item.name, product);
    }
  }
  const topProducts = [...productMap.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
  const topCustomers = [...customerMap.entries()].map(([customerId, value]) => ({ customerId, ...value })).sort((a, b) => b.revenue - a.revenue || a.customerId.localeCompare(b.customerId));
  return { orderCount: orders.length, totalRevenue, revenueByStatus, topProducts, topCustomers, cancellationCount };
}

function toReportOrder(id: string, data: Record<string, unknown>): ReportOrder {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  return {
    id,
    status: data.status as ReportOrder["status"],
    total: typeof data.total === "number" ? data.total : 0,
    customerId: typeof data.clienteUid === "string" ? data.clienteUid : "historico",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    items: rawItems.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      return [{ name: String(item.name ?? "Producto"), quantity: typeof item.quantity === "number" ? item.quantity : 0, subtotal: typeof item.subtotal === "number" ? item.subtotal : 0 }];
    }),
  };
}

export async function generateOrderReport(filter: OrderReportFilter): Promise<OrderReport> {
  const snapshot = await getAdminDb().collection("pedidos").orderBy("createdAt", "desc").limit(500).get();
  const orders = snapshot.docs.map((document) => toReportOrder(document.id, document.data() as Record<string, unknown>)).filter((order) => {
    if (filter.from && order.createdAt < filter.from) return false;
    if (filter.to && order.createdAt > filter.to) return false;
    return !filter.status || order.status === filter.status;
  });
  return aggregateOrders(orders);
}
