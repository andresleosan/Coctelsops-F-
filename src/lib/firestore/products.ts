import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import { productInputSchema } from "@/lib/validation/catalog";
import type { Product, ProductInput } from "@/types/catalog";

type ProductReadOptions = {
  includeInactive?: boolean;
};

function productCollection() {
  return getAdminDb().collection("productos");
}

function toProduct(id: string, data: Record<string, unknown>): Product {
  const input = productInputSchema.parse({
    name: data.name,
    description: data.description,
    price: data.price,
    image: data.image,
    category: data.category,
    availableFlavors: data.availableFlavors,
    availableAddOns: data.availableAddOns,
    stock: data.stock,
    active: data.active,
    featured: data.featured,
  });

  return { id, ...input };
}

export async function listProducts(options: ProductReadOptions = {}): Promise<Product[]> {
  const query = options.includeInactive
    ? productCollection()
    : productCollection().where("active", "==", true);
  const snapshot = await query.get();

  return snapshot.docs.map((document) => toProduct(document.id, document.data() as Record<string, unknown>));
}

export function listActiveProducts(): Promise<Product[]> {
  return listProducts();
}

export function listAllProducts(): Promise<Product[]> {
  return listProducts({ includeInactive: true });
}

export async function getProductById(id: string, options: ProductReadOptions = {}): Promise<Product | null> {
  if (!id.trim()) return null;

  const snapshot = await productCollection().doc(id).get();
  if (!snapshot.exists) return null;

  const product = toProduct(id, snapshot.data() as Record<string, unknown>);
  return options.includeInactive || product.active ? product : null;
}

export async function createProduct(input: ProductInput, id?: string): Promise<string> {
  const validated = productInputSchema.parse(input);
  const reference = id ? productCollection().doc(id) : productCollection().doc();
  const now = new Date().toISOString();

  await reference.set({ ...validated, createdAt: now, updatedAt: now });
  return reference.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const validated = productInputSchema.parse(input);
  await productCollection().doc(id).update({ ...validated, updatedAt: new Date().toISOString() });
}
