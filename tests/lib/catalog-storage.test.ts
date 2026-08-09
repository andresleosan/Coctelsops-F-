import { beforeEach, describe, expect, it, vi } from "vitest";

const { save, file } = vi.hoisted(() => ({ save: vi.fn(), file: vi.fn() }));
const bucket = { name: "example.firebasestorage.app", file };

vi.mock("@/lib/firebase-admin", () => ({ getAdminStorageBucket: () => bucket }));

import { uploadProductImageBytes } from "@/lib/catalog/storage";

describe("Storage de imágenes de catálogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    file.mockReturnValue({ save });
    save.mockResolvedValue(undefined);
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
});
