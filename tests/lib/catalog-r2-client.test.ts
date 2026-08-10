import { beforeEach, describe, expect, it, vi } from "vitest";

const s3Mocks = vi.hoisted(() => ({
  send: vi.fn(),
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(function (input: unknown) {
    return { input };
  }),
  DeleteObjectCommand: vi.fn(function (input: unknown) {
    return { input };
  }),
}));

vi.mock("@aws-sdk/client-s3", () => s3Mocks);

const R2_VARIABLES = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL",
] as const;

function configureR2Environment() {
  vi.stubEnv("R2_ACCOUNT_ID", "account-123");
  vi.stubEnv("R2_BUCKET_NAME", "catalog-images");
  vi.stubEnv("R2_ACCESS_KEY_ID", "access-key-for-tests");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret-key-for-tests");
  vi.stubEnv("R2_PUBLIC_BASE_URL", "https://img.example.com");
}

async function loadClient() {
  return import("@/lib/catalog/r2-client");
}

describe("cliente de imágenes de catálogo en Cloudflare R2", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    configureR2Environment();
    s3Mocks.S3Client.mockImplementation(function () {
      return { send: s3Mocks.send };
    });
    s3Mocks.send.mockResolvedValue({});
  });

  it("crea el cliente de forma perezosa con el endpoint y la configuración privada de R2", async () => {
    const { getR2CatalogImageStore } = await loadClient();

    expect(s3Mocks.S3Client).not.toHaveBeenCalled();
    getR2CatalogImageStore();

    expect(s3Mocks.S3Client).toHaveBeenCalledWith({
      endpoint: "https://account-123.r2.cloudflarestorage.com",
      region: "auto",
      credentials: {
        accessKeyId: "access-key-for-tests",
        secretAccessKey: "secret-key-for-tests",
      },
      maxAttempts: 3,
    });
  });

  it("envía PutObjectCommand con el bucket, MIME y caché del catálogo", async () => {
    const { getR2CatalogImageStore } = await loadClient();
    const store = getR2CatalogImageStore();
    const bytes = new Uint8Array([1, 2, 3]);

    await store.put({
      key: "catalog/products/fresa/fresa.jpg",
      bytes,
      contentType: "image/jpeg",
    });

    expect(s3Mocks.PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "catalog-images",
      Key: "catalog/products/fresa/fresa.jpg",
      Body: bytes,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=3600",
    });
    expect(s3Mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ Key: "catalog/products/fresa/fresa.jpg" }),
    }));
  });

  it("envía DeleteObjectCommand contra el mismo bucket", async () => {
    const { getR2CatalogImageStore } = await loadClient();
    const store = getR2CatalogImageStore();

    await store.remove("catalog/products/fresa/fresa.jpg");

    expect(s3Mocks.DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "catalog-images",
      Key: "catalog/products/fresa/fresa.jpg",
    });
    expect(s3Mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ Key: "catalog/products/fresa/fresa.jpg" }),
    }));
  });

  it("construye una URL pública codificando segmentos sin codificar las barras", async () => {
    const { getR2CatalogImageStore } = await loadClient();
    const store = getR2CatalogImageStore();

    expect(store.publicUrl("catalog/products/fresa/fresa.jpg")).toBe(
      "https://img.example.com/catalog/products/fresa/fresa.jpg",
    );
  });

  it("rechaza variables ausentes sin imprimir valores privados", async () => {
    const { getR2CatalogImageStore } = await loadClient();
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(Promise.resolve().then(() => getR2CatalogImageStore())).rejects.toThrow(
      "Falta la variable R2_SECRET_ACCESS_KEY",
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("access-key-for-tests");

    consoleError.mockRestore();
  });

  it.each(R2_VARIABLES)("rechaza %s cuando está vacía", async (variable) => {
    vi.stubEnv(variable, "");
    const { getR2CatalogImageStore } = await loadClient();

    await expect(Promise.resolve().then(() => getR2CatalogImageStore())).rejects.toThrow(
      `Falta la variable ${variable}`,
    );
    expect(s3Mocks.S3Client).not.toHaveBeenCalled();
  });
});
