import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { getAdminDb } from "@/lib/firebase-admin";
import { ORDER_STATUSES, type OrderStatus } from "@/types/orders";

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePermission(request as never, "pedidos.read");
    const db = getAdminDb();
    const [ordersSnapshot, productsSnapshot, customersSnapshot] = await Promise.all([
      db.collection("pedidos").orderBy("createdAt", "desc").limit(200).get(),
      db.collection("productos").where("active", "==", true).get(),
      db.collection("users").where("accountType", "==", "customer").get(),
    ]);
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<OrderStatus, number>;
    let revenue = 0;
    for (const document of ordersSnapshot.docs) {
      const data = document.data() as { status?: unknown; total?: unknown };
      if (typeof data.status === "string" && data.status in byStatus) byStatus[data.status as OrderStatus] += 1;
      if (data.status !== "cancelado" && typeof data.total === "number") revenue += data.total;
    }
    return Response.json({ stats: {
      orders: ordersSnapshot.size,
      pending: byStatus.pendiente,
      activeProducts: productsSnapshot.size,
      customers: customersSnapshot.size,
      revenue,
      byStatus,
    } });
  } catch (error) {
    return toAuthorizationResponse(error);
  }
}
