import "server-only";

import { hasPermission } from "@/lib/auth/permissions";
import { AuthorizationError } from "@/lib/auth/verify-request";
import { getProductById } from "@/lib/firestore/products";
import { getAdminDb } from "@/lib/firebase-admin";
import { createAuditEntry, writeAuditInTransaction } from "@/lib/firestore/audit";
import { createNotification } from "@/lib/firestore/notifications";
import { calculatePromotion, getPromotionByCode } from "@/lib/firestore/promotions";
import { toCustomerOrder } from "@/lib/orders/customer-order";
import {
  assertOrderOwnership,
  assertValidTransition,
  calculateOrder,
  createOrderInputSchema,
  OrderValidationError,
  statusUpdateSchema,
} from "@/lib/validation/orders";
import type { VerifiedUser } from "@/types/auth";
import type { CreateOrderInput, Order, OrderStatus, OrderStatusHistoryEntry, StatusUpdate, CustomerOrder } from "@/types/orders";

export class OrderNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Pedido no encontrado");
    this.name = "OrderNotFoundError";
  }
}

function ordersCollection() {
  return getAdminDb().collection("pedidos");
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ["pendiente", "confirmado", "preparando", "en_camino", "entregado", "cancelado"].includes(value);
}

function toOrder(id: string, data: Record<string, unknown>): Order {
  if (!isOrderStatus(data.status)) throw new OrderValidationError("El estado del pedido no es valido");
  const status = data.status;
  const statusHistory = Array.isArray(data.statusHistory)
    ? data.statusHistory.flatMap((entry): OrderStatusHistoryEntry[] => {
      if (!entry || typeof entry !== "object") return [];
      const event = entry as Record<string, unknown>;
      if (!isOrderStatus(event.status) || typeof event.at !== "string") return [];
      return [{
        status: event.status,
        at: event.at,
        ...(typeof event.actorUid === "string" ? { actorUid: event.actorUid } : {}),
        ...(typeof event.reason === "string" ? { reason: event.reason } : {}),
      }];
    })
    : undefined;

  return {
    id,
    clienteUid: String(data.clienteUid ?? ""),
    customerName: String(data.customerName ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
    notes: typeof data.notes === "string" ? data.notes : undefined,
    items: Array.isArray(data.items) ? data.items as Order["items"] : [],
    subtotal: typeof data.subtotal === "number" ? data.subtotal : Number(data.total ?? 0),
    total: typeof data.total === "number" ? data.total : 0,
    status,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? data.createdAt ?? ""),
    audit: (data.audit ?? {}) as Order["audit"],
    ...(statusHistory?.length ? { statusHistory } : {}),
    promotionCode: typeof data.promotionCode === "string" ? data.promotionCode : undefined,
  };
}

function requireOrderPermission(user: VerifiedUser, permission: "pedidos.read" | "pedidos.update"): void {
  if (!hasPermission(user.profile, permission)) {
    throw new AuthorizationError(403, "No tienes permiso para acceder a los pedidos");
  }
}

export async function createOrder(user: VerifiedUser, input: CreateOrderInput): Promise<Order> {
  const validated = createOrderInputSchema.parse(input);
  const products = await Promise.all(validated.items.map((item) => getProductById(item.productId)));
  const availableProducts = products.filter((product): product is NonNullable<typeof product> => product !== null);
  const calculated = calculateOrder(validated, availableProducts);
  let promotionCode: string | undefined;
  let promotionId: string | undefined;
  if (validated.promotionCode) {
    const promotion = await getPromotionByCode(validated.promotionCode);
    if (!promotion) throw new OrderValidationError("La promoción no es válida");
    const promotionResult = calculatePromotion({ promotion, subtotal: calculated.subtotal, now: new Date().toISOString(), items: calculated.items.map((item) => ({ productId: item.productId, category: availableProducts.find((product) => product.id === item.productId)?.category ?? "", subtotal: item.subtotal })) });
    if (!promotionResult.applied) throw new OrderValidationError(`La promoción no es válida: ${promotionResult.reason}`);
    calculated.total = promotionResult.total;
    promotionCode = promotion.code;
    promotionId = promotion.id;
  }
  const now = new Date().toISOString();
  const data = {
    clienteUid: user.uid,
    customerName: validated.customerName,
    phone: validated.phone,
    address: validated.address,
    ...(validated.notes ? { notes: validated.notes } : {}),
    items: calculated.items,
    subtotal: calculated.subtotal,
    total: calculated.total,
    status: "pendiente" as const,
    createdAt: now,
    updatedAt: now,
    statusHistory: [{ status: "pendiente" as const, actorUid: user.uid, at: now }],
    audit: { createdByUid: user.uid, createdAt: now },
    ...(promotionCode ? { promotionCode } : {}),
  };
  const db = getAdminDb();
  const reference = db.collection("pedidos").doc();
  await db.runTransaction(async (transaction) => {
    if (promotionId) {
      const promotionReference = db.collection("promociones").doc(promotionId);
      const promotionSnapshot = await transaction.get(promotionReference);
      const promotionData = (promotionSnapshot.data() ?? {}) as Record<string, unknown>;
      const usageCount = typeof promotionData.usageCount === "number" ? promotionData.usageCount : 0;
      const usageLimit = typeof promotionData.usageLimit === "number" ? promotionData.usageLimit : undefined;
      if (!promotionSnapshot.exists || promotionData.active !== true || (usageLimit !== undefined && usageCount >= usageLimit)) {
        throw new OrderValidationError("La promoción ya no está disponible");
      }
      transaction.update(promotionReference, { usageCount: usageCount + 1, updatedAt: new Date().toISOString() });
    }
    transaction.create(reference, data);
  });
  await Promise.all([
    createAuditEntry({ actorUid: user.uid, action: "create", module: "pedidos", entityId: reference.id, changes: { total: data.total, itemCount: data.items.length } }),
    createNotification({ audience: "admin", title: "Nuevo pedido", message: `Se recibió el pedido #${reference.id.slice(0, 8)}.`, orderId: reference.id }),
  ]);

  return { id: reference.id, ...data };
}

export async function listOrders(user: VerifiedUser): Promise<Order[]> {
  requireOrderPermission(user, "pedidos.read");
  const snapshot = await ordersCollection().orderBy("createdAt", "desc").limit(50).get();
  return snapshot.docs.map((document) => toOrder(document.id, (document.data() ?? {}) as Record<string, unknown>));
}

export async function listOwnOrders(user: VerifiedUser): Promise<CustomerOrder[]> {
  const snapshot = await ordersCollection()
    .where("clienteUid", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snapshot.docs.map((document) => toCustomerOrder(toOrder(document.id, (document.data() ?? {}) as Record<string, unknown>)));
}

export async function getCustomerOrder(user: VerifiedUser, id: string): Promise<CustomerOrder> {
  if (!id.trim()) throw new OrderNotFoundError();
  const snapshot = await ordersCollection().doc(id).get();
  if (!snapshot.exists) throw new OrderNotFoundError();
  const order = toOrder(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
  assertOrderOwnership(user, order.clienteUid);
  return toCustomerOrder(order);
}

export async function getAdminOrder(user: VerifiedUser, id: string): Promise<Order> {
  requireOrderPermission(user, "pedidos.read");
  if (!id.trim()) throw new OrderNotFoundError();
  const snapshot = await ordersCollection().doc(id).get();
  if (!snapshot.exists) throw new OrderNotFoundError();
  return toOrder(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
}

export async function updateOrderStatus(user: VerifiedUser, id: string, input: StatusUpdate): Promise<Order> {
  requireOrderPermission(user, "pedidos.update");
  const validated = statusUpdateSchema.parse(input);
  const db = getAdminDb();
  const reference = db.collection("pedidos").doc(id);
  const notification = db.collection("notificaciones").doc();
  let updated: Order | undefined;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new OrderNotFoundError();
    const current = toOrder(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
    assertValidTransition(current.status, validated.status);
    const now = new Date().toISOString();
    const statusEvent = { status: validated.status, actorUid: user.uid, at: now, ...(validated.reason ? { reason: validated.reason } : {}) };
    const statusHistory: OrderStatusHistoryEntry[] = [...(current.statusHistory ?? []), statusEvent];
    const update = {
      status: validated.status,
      updatedAt: now,
      statusHistory,
      audit: { ...current.audit, updatedByUid: user.uid, updatedAt: now },
    };
    transaction.update(reference, update);
    transaction.create(notification, {
      uid: current.clienteUid,
      orderId: id,
      audience: "customer",
      title: "Actualización de pedido",
      message: `Tu pedido ahora está ${validated.status.replace("_", " ")}.`,
      status: validated.status,
      createdAt: now,
      read: false,
    });
    writeAuditInTransaction(transaction, { actorUid: user.uid, action: "update", module: "pedidos", entityId: id, changes: { status: validated.status, reason: validated.reason } });
    updated = { ...current, ...update, status: validated.status, updatedAt: now, audit: update.audit };
  });

  if (!updated) throw new Error("No fue posible actualizar el pedido");
  return updated;
}
