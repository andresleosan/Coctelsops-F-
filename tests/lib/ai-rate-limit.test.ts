import { describe, expect, it } from "vitest";

import {
  getRateLimitIdentity,
  hashRateLimitIdentity,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/ai/ai-rate-limit";

describe("AI rate limit identity helpers", () => {
  it("prioriza la identidad de Cloudflare y usa solo su primera entrada", () => {
    const headers = new Headers({
      "cf-connecting-ip": " 203.0.113.8, 203.0.113.9 ",
      "x-forwarded-for": "198.51.100.4, 198.51.100.5",
      "x-real-ip": "192.0.2.1",
    });

    expect(getRateLimitIdentity(headers)).toBe("203.0.113.8");
  });

  it("usa la primera entrada de forwarded y luego real-ip", () => {
    expect(
      getRateLimitIdentity(new Headers({ "x-forwarded-for": " 198.51.100.4, 198.51.100.5 " })),
    ).toBe("198.51.100.4");
    expect(getRateLimitIdentity(new Headers({ "x-real-ip": " 192.0.2.1 " }))).toBe("192.0.2.1");
  });

  it("ignora headers vacios y usa el bucket anonimo si no hay identidad confiable", () => {
    expect(
      getRateLimitIdentity(
        new Headers({
          "cf-connecting-ip": "   ",
          "x-forwarded-for": " ,  ",
          "x-real-ip": " 192.0.2.1 ",
        }),
      ),
    ).toBe("192.0.2.1");
    expect(getRateLimitIdentity(new Headers())).toBe("anonymous");
  });

  it("genera un digest HMAC-SHA256 hexadecimal sin exponer la identidad", () => {
    const identity = "203.0.113.8";
    const digest = hashRateLimitIdentity(identity, "secret");

    expect(digest).toBe("5ba41ff0e03c61177c8d3a10dc68a7982466bfc6edb86c06363e5d57cc121072");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain(identity);
  });

  it("expone el limite y la ventana exactos", () => {
    expect(RATE_LIMIT_MAX_REQUESTS).toBe(5);
    expect(RATE_LIMIT_WINDOW_MS).toBe(10 * 60 * 1000);
  });
});
