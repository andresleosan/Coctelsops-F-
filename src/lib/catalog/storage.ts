import "server-only";

import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { getAdminStorageBucket } from "@/lib/firebase-admin";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_CONTENT_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

export class CatalogImageError extends Error {
  readonly status: 413 | 422;

  constructor(message: string, status: 413 | 422 = 422) {
    super(message);
    this.name = "CatalogImageError";
    this.status = status;
  }
}

function assertProductId(productId: string): void {
  if (!/^[a-z0-9-]+$/.test(productId)) throw new CatalogImageError("El identificador del producto no es válido");
}

function assertSafeFilename(filename: string): void {
  if (!filename || filename.startsWith("/") || filename.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(filename)) {
    throw new CatalogImageError("El nombre de archivo no es una ruta relativa segura");
  }

  const segments = filename.split(/[\\/]/);
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new CatalogImageError("El nombre de archivo no es una ruta relativa segura");
  }
}

function contentTypeForFilename(filename: string): string {
  const contentType = IMAGE_CONTENT_TYPES.get(path.extname(filename).toLocaleLowerCase());
  if (!contentType) throw new CatalogImageError("Solo se aceptan imágenes JPEG, PNG o WebP");
  return contentType;
}

function assertImageInput(input: { bytes: Uint8Array; filename: string; contentType: string }): void {
  assertSafeFilename(input.filename);
  const expectedContentType = contentTypeForFilename(input.filename);
  if (input.contentType !== expectedContentType) throw new CatalogImageError("El tipo de imagen no coincide con el archivo");
  if (input.bytes.byteLength > MAX_IMAGE_BYTES) throw new CatalogImageError("La imagen supera el máximo de 5 MB", 413);
}

function resolveLocalImagePath(imageFile: string): string {
  assertSafeFilename(imageFile);
  const imagesDirectory = path.resolve(process.cwd(), "scripts/catalog/images");
  const resolved = path.resolve(imagesDirectory, imageFile);
  const relative = path.relative(imagesDirectory, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new CatalogImageError("El archivo de imagen está fuera del directorio permitido");
  return resolved;
}

export async function validateLocalProductImage(imageFile: string): Promise<void> {
  const imagePath = resolveLocalImagePath(imageFile);
  const imageStats = await stat(imagePath);
  if (!imageStats.isFile()) throw new CatalogImageError("El archivo de imagen no es válido");
  contentTypeForFilename(imageFile);
  if (imageStats.size > MAX_IMAGE_BYTES) throw new CatalogImageError("La imagen supera el máximo de 5 MB", 413);
}

export async function uploadProductImageBytes(
  input: { bytes: Uint8Array; filename: string; contentType: string },
  productId: string,
): Promise<string> {
  assertProductId(productId);
  assertImageInput(input);

  const storagePath = `catalog/products/${productId}/${input.filename.replaceAll("\\", "/")}`;
  const token = randomUUID();
  const file = getAdminStorageBucket().file(storagePath);
  await file.save(Buffer.from(input.bytes), {
    metadata: {
      contentType: input.contentType,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(getAdminStorageBucket().name)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

export async function uploadLocalProductImage(imageFile: string, productId: string): Promise<string> {
  const imagePath = resolveLocalImagePath(imageFile);
  const bytes = new Uint8Array(await readFile(imagePath));
  return uploadProductImageBytes({ bytes, filename: imageFile, contentType: contentTypeForFilename(imageFile) }, productId);
}
