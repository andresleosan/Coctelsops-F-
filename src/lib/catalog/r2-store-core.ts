import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export interface CatalogImageStore {
  put(input: { key: string; bytes: Uint8Array; contentType: string }): Promise<void>;
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export type R2CatalogImageStoreConfig = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

export function createR2CatalogImageStore(config: R2CatalogImageStoreConfig): CatalogImageStore {
  const client = new S3Client({
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    maxAttempts: 3,
  });
  const publicBaseUrl = config.publicBaseUrl.replace(/\/+$/, "");

  return {
    async put({ key, bytes, contentType }) {
      await client.send(new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=3600",
      }));
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }));
    },
    publicUrl(key) {
      const encodedKey = key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
      return `${publicBaseUrl}/${encodedKey}`;
    },
  };
}
