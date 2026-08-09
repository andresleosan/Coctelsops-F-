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
      bytes: new Uint8Array([1, 2, 3]),
      filename: "fresa.jpg",
      contentType: "image/jpeg",
    }, "fresa-salvaje");

    expect(file).toHaveBeenCalledWith("catalog/products/fresa-salvaje/fresa.jpg");
    expect(save).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({
      metadata: expect.objectContaining({ contentType: "image/jpeg", metadata: expect.objectContaining({ firebaseStorageDownloadTokens: expect.any(String) }) }),
    }));
    expect(url).toContain("catalog%2Fproducts%2Ffresa-salvaje%2Ffresa.jpg");
  });
});
