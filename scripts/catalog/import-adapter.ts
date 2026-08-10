import { getSeedAdminDb, getSeedAdminStorageBucket } from "../firebase-admin";

import { productInputSchema } from "../../src/lib/validation/catalog";
import { uploadCatalogImageBytes } from "../../src/lib/catalog/storage-core";
import type { ProductInput } from "../../src/types/catalog";

export function uploadProductImageBytes(input: { bytes: Uint8Array; filename: string; contentType: string }, productId: string): Promise<string> {
  return uploadCatalogImageBytes(input, productId, getSeedAdminStorageBucket);
}

export async function upsertImportedProduct(id: string, input: ProductInput, actorUid: string): Promise<"created" | "updated"> {
  const validated = productInputSchema.parse(input);
  const db = getSeedAdminDb();
  const reference = db.collection("productos").doc(id);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const now = new Date().toISOString();
    const createdAt = snapshot.exists && typeof snapshot.data()?.createdAt === "string" ? snapshot.data()?.createdAt : now;
    const action = snapshot.exists ? "updated" : "created";
    const data = { ...validated, createdAt, updatedAt: now };
    if (snapshot.exists) transaction.update(reference, data);
    else transaction.set(reference, data);
    const auditReference = db.collection("auditoria").doc();
    transaction.create(auditReference, {
      actorUid,
      action: action === "created" ? "create" : "update",
      module: "productos",
      entityId: id,
      changes: validated,
      createdAt: now,
    });
    return action;
  });
}
