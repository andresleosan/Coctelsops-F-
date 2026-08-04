import { PRODUCTS } from "@/app/lib/products";
import { seedProduct } from "@/lib/firestore/products";
import { getAdminDb } from "@/lib/firebase-admin";
import type { CategoryInput } from "@/types/catalog";

const CATEGORY_SEEDS: Record<string, CategoryInput> = {
  granizado: { name: "Granizados", active: true, order: 1 },
  cocktail: { name: "Cocteles", active: true, order: 2 },
  special: { name: "Especiales", active: true, order: 3 },
};

export async function seedCatalog(): Promise<void> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  for (const product of PRODUCTS) {
    const { id, ...input } = product;
    await seedProduct(input, id);
  }

  for (const [id, input] of Object.entries(CATEGORY_SEEDS)) {
    await db.collection("categorias").doc(id).set({ ...input, updatedAt: now }, { merge: true });
  }
}

if (require.main === module) {
  seedCatalog()
    .then(() => console.log(`Catálogo sembrado: ${PRODUCTS.length} productos y ${Object.keys(CATEGORY_SEEDS).length} categorías.`))
    .catch((error: unknown) => {
      console.error("No fue posible sembrar el catálogo", error instanceof Error ? error.message : "Error desconocido");
      process.exitCode = 1;
    });
}
