import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import { writeAuditInTransaction } from "@/lib/firestore/audit";
import type { InventoryMovement, InventoryMovementInput } from "@/types/operations";

export class InventoryValidationError extends Error {
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = "InventoryValidationError";
  }
}

export function calculateInventoryStock(currentStock: number, movement: Pick<InventoryMovementInput, "type" | "quantity">): number {
  if (!Number.isInteger(currentStock) || currentStock < 0) throw new InventoryValidationError("El stock actual no es válido");
  if (!Number.isInteger(movement.quantity) || movement.quantity === 0 || (movement.type !== "ajuste" && movement.quantity < 0)) {
    throw new InventoryValidationError("La cantidad debe ser un entero válido");
  }
  const delta = movement.type === "entrada" ? movement.quantity : movement.type === "salida" ? -movement.quantity : movement.quantity;
  const nextStock = currentStock + delta;
  if (nextStock < 0) throw new InventoryValidationError("stock insuficiente");
  return nextStock;
}

export async function recordInventoryMovement(input: InventoryMovementInput): Promise<void> {
  if (!input.productId.trim() || !input.actorUid.trim() || !input.reason.trim()) throw new InventoryValidationError("Producto, actor y motivo son obligatorios");
  const db = getAdminDb();
  const productRef = db.collection("productos").doc(input.productId);
  const movementRef = db.collection("inventario_movimientos").doc();
  await db.runTransaction(async (transaction) => {
    const productSnapshot = await transaction.get(productRef);
    if (!productSnapshot.exists) throw new InventoryValidationError("Producto no encontrado");
    const data = (productSnapshot.data() ?? {}) as Record<string, unknown>;
    const previousStock = typeof data.stock === "number" ? data.stock : 0;
    const resultingStock = calculateInventoryStock(previousStock, input);
    const now = new Date().toISOString();
    const movement: Omit<InventoryMovement, "id"> = { ...input, previousStock, resultingStock, createdAt: now };
    transaction.update(productRef, { stock: resultingStock, available: resultingStock > 0, updatedAt: now });
    transaction.create(movementRef, movement);
    writeAuditInTransaction(transaction, { actorUid: input.actorUid, action: "create", module: "inventario", entityId: input.productId, changes: { type: input.type, quantity: input.quantity, reason: input.reason, previousStock, resultingStock } });
  });
}

export async function listInventoryMovements(limit = 50): Promise<InventoryMovement[]> {
  const snapshot = await getAdminDb().collection("inventario_movimientos").orderBy("createdAt", "desc").limit(Math.min(Math.max(limit, 1), 100)).get();
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() as Omit<InventoryMovement, "id">) }));
}
