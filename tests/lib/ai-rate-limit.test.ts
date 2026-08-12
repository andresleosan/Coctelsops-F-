import { describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";

import {
  getRateLimitIdentity,
  hashRateLimitIdentity,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  reserveAIRateLimit,
} from "@/lib/ai/ai-rate-limit";

function createFakeFirestoreRateLimitDb(): Firestore {
  const documents = new Map<string, Record<string, unknown>>();

  const db = {
    collection(collectionName: string) {
      return {
        doc(documentId: string) {
          const path = `${collectionName}/${documentId}`;
          return { path };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
      return callback({
        async get(reference: { path: string }) {
          const data = documents.get(reference.path);
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        create(reference: { path: string }, data: Record<string, unknown>) {
          documents.set(reference.path, data);
        },
        update(reference: { path: string }, data: Record<string, unknown>) {
          documents.set(reference.path, {
            ...documents.get(reference.path),
            ...data,
          });
        },
      });
    },
  } as unknown as Firestore;

  return db;
}

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

  it("permite las primeras cinco reservas y rechaza la sexta", async () => {
    const db = createFakeFirestoreRateLimitDb();
    const digest = "a".repeat(64);
    const firstRequest = new Date("2026-08-11T12:00:00.000Z");

    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(
        reserveAIRateLimit({ db, digest, now: firstRequest }),
      ).resolves.toBe(true);
    }

    await expect(
      reserveAIRateLimit({
        db,
        digest,
        now: new Date("2026-08-11T12:01:00.000Z"),
      }),
    ).resolves.toBe(false);
  });

  it("reinicia la ventana vencida", async () => {
    const db = createFakeFirestoreRateLimitDb();
    const digest = "b".repeat(64);
    const firstRequest = new Date("2026-08-11T12:00:00.000Z");

    for (let attempt = 0; attempt < 5; attempt++) {
      await reserveAIRateLimit({ db, digest, now: firstRequest });
    }

    await expect(
      reserveAIRateLimit({
        db,
        digest,
        now: new Date("2026-08-11T12:10:00.001Z"),
      }),
    ).resolves.toBe(true);
  });
});
