import "server-only";

import { requireEnv } from "@/lib/server-env";
import {
  createR2CatalogImageStore,
  type CatalogImageStore,
} from "@/lib/catalog/r2-store-core";

export type { CatalogImageStore } from "@/lib/catalog/r2-store-core";

let catalogImageStore: CatalogImageStore | undefined;

export function getR2CatalogImageStore(): CatalogImageStore {
  if (catalogImageStore) {
    return catalogImageStore;
  }

  catalogImageStore = createR2CatalogImageStore({
    accountId: requireEnv("R2_ACCOUNT_ID"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    publicBaseUrl: requireEnv("R2_PUBLIC_BASE_URL"),
  });

  return catalogImageStore;
}
