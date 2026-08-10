import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("configuración de imágenes de Next.js", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("incluye el host R2 HTTPS configurado en remotePatterns", async () => {
    vi.stubEnv("R2_PUBLIC_BASE_URL", "https://images.example.com");
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");

    const { default: nextConfig } = await import("../../next.config");

    expect(nextConfig.images?.remotePatterns).toContainEqual({
      protocol: "https",
      hostname: "images.example.com",
      port: "",
      pathname: "/**",
    });
  });
});
