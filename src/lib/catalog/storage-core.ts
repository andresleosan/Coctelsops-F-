import { randomUUID } from "node:crypto";
import type { Bucket } from "@google-cloud/storage";

import {
  assertCatalogProductId,
  validateProductImageBytes,
} from "@/lib/catalog/image-validation";

export async function uploadCatalogImageBytes(
  input: { bytes: Uint8Array; filename: string; contentType: string },
  productId: string,
  getBucket: () => Bucket,
): Promise<string> {
  assertCatalogProductId(productId);
  validateProductImageBytes(input);

  const storagePath = `catalog/products/${productId}/${input.filename.replaceAll("\\", "/")}`;
  const token = randomUUID();
  const bucket = getBucket();
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(input.bytes), {
    metadata: {
      contentType: input.contentType,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
}
