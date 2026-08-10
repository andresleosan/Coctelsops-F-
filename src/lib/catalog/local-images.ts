import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import {
  CatalogImageError,
  contentTypeForFilename,
  MAX_IMAGE_BYTES,
  assertSafeImageFilename,
  validateProductImageContent,
} from "@/lib/catalog/image-validation";

export type LocalProductImage = {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
};

export async function resolveLocalImagePath(imageFile: string): Promise<string> {
  assertSafeImageFilename(imageFile);
  const imagesDirectory = path.resolve(process.cwd(), "scripts/catalog/images");
  const resolved = path.resolve(imagesDirectory, imageFile);
  const relative = path.relative(imagesDirectory, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new CatalogImageError("El archivo de imagen está fuera del directorio permitido");

  try {
    const realImagesDirectory = await realpath(imagesDirectory);
    if (path.relative(imagesDirectory, realImagesDirectory) !== "") {
      throw new CatalogImageError("El directorio de imágenes no es la carpeta esperada del repositorio");
    }
    const realImagePath = await realpath(resolved);
    const realRelative = path.relative(realImagesDirectory, realImagePath);
    if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) throw new CatalogImageError("El archivo de imagen está fuera del directorio permitido");
    return realImagePath;
  } catch (error) {
    if (error instanceof CatalogImageError) throw error;
    throw new CatalogImageError("No se pudo resolver el archivo de imagen");
  }
}

export async function readValidatedLocalProductImage(imageFile: string): Promise<LocalProductImage> {
  const imagePath = await resolveLocalImagePath(imageFile);
  const imageStats = await stat(imagePath);
  if (!imageStats.isFile()) throw new CatalogImageError("El archivo de imagen no es válido");
  const contentType = contentTypeForFilename(imageFile);
  if (imageStats.size > MAX_IMAGE_BYTES) throw new CatalogImageError("La imagen supera el máximo de 5 MB", 413);
  const bytes = new Uint8Array(await readFile(imagePath));
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new CatalogImageError("La imagen supera el máximo de 5 MB", 413);
  validateProductImageContent(bytes, contentType);
  return { bytes, filename: imageFile, contentType };
}
