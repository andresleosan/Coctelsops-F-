import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import { categoryInputSchema } from "@/lib/validation/catalog";
import type { Category } from "@/types/catalog";

function categoryCollection() {
  return getAdminDb().collection("categorias");
}

function toCategory(id: string, data: Record<string, unknown>): Category {
  return { id, ...categoryInputSchema.parse(data) };
}

export async function listCategories(): Promise<Category[]> {
  const snapshot = await categoryCollection().where("active", "==", true).get();
  return snapshot.docs
    .map((document) => toCategory(document.id, document.data() as Record<string, unknown>))
    .sort((left, right) => left.order - right.order);
}

export async function listAllCategories(): Promise<Category[]> {
  const snapshot = await categoryCollection().get();
  return snapshot.docs
    .map((document) => toCategory(document.id, document.data() as Record<string, unknown>))
    .sort((left, right) => left.order - right.order);
}
