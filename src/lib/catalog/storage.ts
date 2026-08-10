import "server-only";

import { getAdminStorageBucket } from "@/lib/firebase-admin";
import { readValidatedLocalProductImage } from "@/lib/catalog/local-images";
import { uploadCatalogImageBytes } from "@/lib/catalog/storage-core";

export { CatalogImageError, validateProductImageContent } from "@/lib/catalog/image-validation";

export async function validateLocalProductImage(imageFile: string): Promise<void> {
  await readValidatedLocalProductImage(imageFile);
}

export async function uploadProductImageBytes(
  input: { bytes: Uint8Array; filename: string; contentType: string },
  productId: string,
): Promise<string> {
  return uploadCatalogImageBytes(input, productId, getAdminStorageBucket);
}

export async function uploadLocalProductImage(imageFile: string, productId: string): Promise<string> {
  const image = await readValidatedLocalProductImage(imageFile);
  return uploadProductImageBytes(image, productId);
}
