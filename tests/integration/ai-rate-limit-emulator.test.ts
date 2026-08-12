import { randomUUID } from "node:crypto";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { reserveAIRateLimit } from "@/lib/ai/ai-rate-limit";

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const emulatorRequired = process.env.FIRESTORE_RULES_EMULATOR === "true" || Boolean(firestoreHost);
const loopbackHostPattern = /^(localhost|127\.0\.0\.1):(\d+)$/;

function assertLoopbackFirestoreHost(host: string | undefined): void {
  if (!host) {
    throw new Error("FIRESTORE_EMULATOR_HOST es obligatorio para esta prueba.");
  }

  const match = loopbackHostPattern.exec(host);
  const port = match ? Number(match[2]) : 0;
  if (!match || port < 1 || port > 65_535) {
    throw new Error("La prueba de rate limit solo permite Firestore Emulator en loopback.");
  }
}

if (emulatorRequired) {
  assertLoopbackFirestoreHost(firestoreHost);
}

const describeWhenEmulatorIsConfigured = emulatorRequired ? describe : describe.skip;
const app = firestoreHost
  ? initializeApp({ projectId: "demo-coctels-e2e" }, `ai-rate-limit-${process.pid}-${randomUUID()}`)
  : undefined;
const db = app ? getFirestore(app) : undefined;
let rateLimitReference: DocumentReference | undefined;

afterEach(async () => {
  if (!rateLimitReference) return;

  await rateLimitReference.delete();
  expect((await rateLimitReference.get()).exists).toBe(false);
  rateLimitReference = undefined;
});

afterAll(async () => {
  if (app) await deleteApp(app);
});

describeWhenEmulatorIsConfigured("AI rate limit contra Firestore Emulator", () => {
  it("reserva exactamente cinco de diez solicitudes concurrentes", async () => {
    const firestore = db as Firestore;
    const digest = `task-4-${process.pid}-${randomUUID()}`;
    const now = new Date("2026-08-11T12:00:00.000Z");
    rateLimitReference = firestore.collection("ai_rate_limits").doc(digest);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => reserveAIRateLimit({ db: firestore, digest, now })),
    );

    expect(results.filter(Boolean)).toHaveLength(5);
    expect(results.filter((result) => !result)).toHaveLength(5);
    expect((await rateLimitReference.get()).data()?.count).toBe(5);
  }, 30_000);
});
