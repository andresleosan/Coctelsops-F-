import { beforeEach, describe, expect, it, vi } from "vitest";

const { requirePermission, uploadProductImageBytes, updateProductImage, getProductById } = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  uploadProductImageBytes: vi.fn(),
  updateProductImage: vi.fn(),
  getProductById: vi.fn(),
}));

vi.mock("@/lib/auth/permissions", () => ({ requirePermission }));
vi.mock("@/lib/auth/verify-request", () => ({
  toAuthorizationResponse: (error: Error & { status?: number }) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
}));
vi.mock("@/lib/catalog/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/catalog/storage")>()),
  uploadProductImageBytes,
}));
vi.mock("@/lib/firestore/products", () => ({ updateProductImage, getProductById }));

import { POST } from "@/app/api/admin/productos/[id]/image/route";

const actor = { uid: "admin-1" };
const product = { id: "fresa-salvaje", name: "Fresa Salvaje", image: "https://old.example/image.jpg" };

function requestWithFile(file: { body: string | Uint8Array; name: string; type: string }): Request {
  const bytes = typeof file.body === "string" ? new TextEncoder().encode(file.body) : file.body;
  const uploadedFile = {
    name: file.name,
    type: file.type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  } as unknown as File;
  return { formData: async () => ({ get: (name: string) => name === "image" ? uploadedFile : null }) } as unknown as Request;
}

describe("POST /api/admin/productos/:id/image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue(actor);
    uploadProductImageBytes.mockResolvedValue("https://firebasestorage.googleapis.com/new-image");
    updateProductImage.mockResolvedValue(undefined);
    getProductById.mockResolvedValue(product);
  });

  it("requiere productos.write y conserva los códigos de autorización", async () => {
    requirePermission.mockRejectedValueOnce(Object.assign(new Error("Prohibido"), { status: 403 }));

    const response = await POST(requestWithFile({ body: "x", name: "fresa.jpg", type: "image/jpeg" }), { params: Promise.resolve({ id: "fresa-salvaje" }) });

    expect(response.status).toBe(403);
    expect(requirePermission).toHaveBeenCalledWith(expect.anything(), "productos.write");
  });

  it("rechaza un archivo sin tipo permitido o demasiado grande", async () => {
    const unsupportedResponse = await POST(requestWithFile({ body: "x", name: "fresa.gif", type: "image/gif" }), { params: Promise.resolve({ id: "fresa-salvaje" }) });
    expect(unsupportedResponse).toMatchObject({ status: 422 });
    await expect(POST(requestWithFile({ body: new Uint8Array(5 * 1024 * 1024 + 1), name: "fresa.jpg", type: "image/jpeg" }), { params: Promise.resolve({ id: "fresa-salvaje" }) })).resolves.toMatchObject({ status: 413 });
    expect(uploadProductImageBytes).not.toHaveBeenCalled();
  });

  it("sube primero y actualiza solo la imagen con auditoría", async () => {
    const response = await POST(requestWithFile({ body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), name: "fresa.jpg", type: "image/jpeg" }), { params: Promise.resolve({ id: "fresa-salvaje" }) });

    expect(response.status).toBe(200);
    expect(uploadProductImageBytes).toHaveBeenCalledWith({ bytes: expect.any(Uint8Array), filename: "fresa.jpg", contentType: "image/jpeg" }, "fresa-salvaje");
    expect(updateProductImage).toHaveBeenCalledWith("fresa-salvaje", "https://firebasestorage.googleapis.com/new-image", actor.uid);
    await expect(response.json()).resolves.toEqual({ product: { ...product, image: "https://firebasestorage.googleapis.com/new-image" } });
  });

  it("rechaza bytes arbitrarios aunque el MIME y la extensión sean JPEG", async () => {
    const response = await POST(requestWithFile({ body: new Uint8Array([1, 2, 3]), name: "fresa.jpg", type: "image/jpeg" }), { params: Promise.resolve({ id: "fresa-salvaje" }) });

    expect(response.status).toBe(422);
    expect(uploadProductImageBytes).not.toHaveBeenCalled();
  });
});
