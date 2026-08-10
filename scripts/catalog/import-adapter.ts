import { getSeedAdminDb } from "../firebase-admin";
import { createR2CatalogImageStore, type CatalogImageStore } from "../../src/lib/catalog/r2-store-core";
import { deleteCatalogImage, uploadCatalogImageBytes } from "../../src/lib/catalog/storage-core";
import { productInputSchema } from "../../src/lib/validation/catalog";
import type { ProductInput } from "../../src/types/catalog";

function requireR2Env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name}`);
  return value;
}

let r2ImageStore: CatalogImageStore | undefined;

function getR2ImageStore(): CatalogImageStore {
  if (!r2ImageStore) {
    r2ImageStore = createR2CatalogImageStore({
      accountId: requireR2Env("R2_ACCOUNT_ID"),
      bucketName: requireR2Env("R2_BUCKET_NAME"),
      accessKeyId: requireR2Env("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireR2Env("R2_SECRET_ACCESS_KEY"),
      publicBaseUrl: requireR2Env("R2_PUBLIC_BASE_URL"),
    });
  }

  return r2ImageStore;
}

export function uploadProductImageBytes(input: { bytes: Uint8Array; filename: string; contentType: string }, productId: string): Promise<{ key: string; url: string }> {
  return uploadCatalogImageBytes(input, productId, getR2ImageStore());
}

export function deleteProductImage(key: string): Promise<void> {
  return deleteCatalogImage(key, getR2ImageStore());
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
