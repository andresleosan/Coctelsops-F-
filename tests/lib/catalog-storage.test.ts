import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const { save, file, readFile, stat, realpath } = vi.hoisted(() => ({ save: vi.fn(), file: vi.fn(), readFile: vi.fn(), stat: vi.fn(), realpath: vi.fn() }));
const bucket = { name: "example.firebasestorage.app", file };

vi.mock("@/lib/firebase-admin", () => ({ getAdminStorageBucket: () => bucket }));
vi.mock("node:fs/promises", () => ({ default: { readFile, stat, realpath }, readFile, stat, realpath }));

import { uploadProductImageBytes, validateLocalProductImage } from "@/lib/catalog/storage";

describe("Storage de imágenes de catálogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    file.mockReturnValue({ save });
    save.mockResolvedValue(undefined);
    stat.mockResolvedValue({ isFile: () => true, size: 4 });
    realpath.mockImplementation(async (value: string) => value);
  });

  it.each([
    ["tipo no permitido", { filename: "fresa.gif", contentType: "image/gif", bytes: new Uint8Array([1]) }],
    ["ruta absoluta", { filename: "C:/secret.jpg", contentType: "image/jpeg", bytes: new Uint8Array([1]) }],
    ["traversal", { filename: "../secret.jpg", contentType: "image/jpeg", bytes: new Uint8Array([1]) }],
    ["tamaño excedido", { filename: "fresa.jpg", contentType: "image/jpeg", bytes: new Uint8Array(5 * 1024 * 1024 + 1) }],
  ])("rechaza %s", async (_case, input) => {
    await expect(uploadProductImageBytes(input, "fresa-salvaje")).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });

  it("guarda la imagen bajo el prefijo del producto con metadatos seguros", async () => {
    const url = await uploadProductImageBytes({
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      filename: "fresa.jpg",
      contentType: "image/jpeg",
    }, "fresa-salvaje");

    expect(file).toHaveBeenCalledWith("catalog/products/fresa-salvaje/fresa.jpg");
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({
      metadata: expect.objectContaining({ contentType: "image/jpeg", metadata: expect.objectContaining({ firebaseStorageDownloadTokens: expect.any(String) }) }),
    }));
    expect(url).toContain("catalog%2Fproducts%2Ffresa-salvaje%2Ffresa.jpg");
  });

  it.each([
    ["JPEG", "fresa.jpg", "image/jpeg", [0xff, 0xd8, 0xff, 0xd9]],
    ["PNG", "fresa.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["WebP", "fresa.webp", "image/webp", [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
  ])("acepta bytes reales de %s", async (_format, filename, contentType, bytes) => {
    await expect(uploadProductImageBytes({ bytes: new Uint8Array(bytes), filename, contentType }, "fresa-salvaje")).resolves.toContain("catalog%2Fproducts%2Ffresa-salvaje");
  });

  it("rechaza bytes arbitrarios aunque MIME y extensión sean válidos", async () => {
    await expect(uploadProductImageBytes({ bytes: new Uint8Array([1, 2, 3]), filename: "fresa.jpg", contentType: "image/jpeg" }, "fresa-salvaje")).rejects.toMatchObject({ status: 422 });
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    ["JPEG", "fresa.jpg", "image/jpeg", [0xff, 0xd8, 0xff, 0xd9]],
    ["PNG", "fresa.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["WebP", "fresa.webp", "image/webp", [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
  ])("el dry-run acepta bytes locales reales de %s", async (_format, filename, _contentType, bytes) => {
    readFile.mockResolvedValueOnce(Buffer.from(bytes));
    stat.mockResolvedValueOnce({ isFile: () => true, size: bytes.length });

    await expect(validateLocalProductImage(filename)).resolves.toBeUndefined();
  });

  it("el dry-run rechaza bytes locales arbitrarios con extensión válida", async () => {
    readFile.mockResolvedValueOnce(Buffer.from([1, 2, 3]));
    stat.mockResolvedValueOnce({ isFile: () => true, size: 3 });

    await expect(validateLocalProductImage("fresa.jpg")).rejects.toMatchObject({ status: 422 });
  });

  it("rechaza un symlink o junction cuyo destino real queda fuera del directorio de imágenes", async () => {
    const imageDirectory = path.resolve(process.cwd(), "scripts/catalog/images");
    realpath.mockImplementation(async (value: string) => value === imageDirectory ? imageDirectory : path.resolve(process.cwd(), "outside/secret.jpg"));

    await expect(validateLocalProductImage("linked.jpg")).rejects.toMatchObject({ status: 422 });
    expect(stat).not.toHaveBeenCalled();
  });
});
