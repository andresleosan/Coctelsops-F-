import "server-only";

import { hasPermission } from "@/lib/auth/permissions";
import { AuthorizationError } from "@/lib/auth/verify-request";
import { getProductById } from "@/lib/firestore/products";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  assertOrderOwnership,
  assertValidTransition,
  calculateOrder,
  createOrderInputSchema,
  OrderValidationError,
  statusUpdateSchema,
} from "@/lib/validation/orders";
import type { VerifiedUser } from "@/types/auth";
import type { CreateOrderInput, Order, OrderStatus, StatusUpdate } from "@/types/orders";

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
  const calculated = calculateOrder(validated, products.filter((product): product is NonNullable<typeof product> => product !== null));
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
  };
  const reference = await ordersCollection().add(data);

  return { id: reference.id, ...data };
}

export async function listOrders(user: VerifiedUser): Promise<Order[]> {
  requireOrderPermission(user, "pedidos.read");
  const snapshot = await ordersCollection().orderBy("createdAt", "desc").limit(50).get();
  return snapshot.docs.map((document) => toOrder(document.id, (document.data() ?? {}) as Record<string, unknown>));
}

export async function getCustomerOrder(user: VerifiedUser, id: string): Promise<Order> {
  if (!id.trim()) throw new OrderNotFoundError();
  const snapshot = await ordersCollection().doc(id).get();
  if (!snapshot.exists) throw new OrderNotFoundError();
  const order = toOrder(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
  assertOrderOwnership(user, order.clienteUid);
  return order;
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
    const update = {
      status: validated.status,
      updatedAt: now,
      statusHistory: [...((snapshot.data()?.statusHistory as unknown[]) ?? []), statusEvent],
      audit: { ...current.audit, updatedByUid: user.uid, updatedAt: now },
    };
    transaction.update(reference, update);
    transaction.create(notification, {
      clienteUid: current.clienteUid,
      orderId: id,
      status: validated.status,
      createdAt: now,
      read: false,
    });
    updated = { ...current, ...update, status: validated.status, updatedAt: now, audit: update.audit };
  });

  if (!updated) throw new Error("No fue posible actualizar el pedido");
  return updated;
}
