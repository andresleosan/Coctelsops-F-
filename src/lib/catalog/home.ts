import "server-only";

import { listActiveProducts } from "@/lib/firestore/products";
import { PRODUCTS } from "@/app/lib/products";
import type { Product } from "@/types/catalog";

function isMissingFirebaseConfiguration(error: unknown): boolean {
  return error instanceof Error && /^Falta la variable FIREBASE_(PROJECT_ID|CLIENT_EMAIL|PRIVATE_KEY)$/.test(error.message);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const products = await listActiveProducts();
    return products.filter((product) => product.featured).slice(0, 3);
  } catch (error) {
    if (!isMissingFirebaseConfiguration(error)) throw error;
    return PRODUCTS.filter((product) => product.active && product.featured).slice(0, 3);
  }
}
