import { existsSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  cleanupLocalE2EState,
  getLocalE2EResourcePlan,
} from "../../scripts/e2e-local-cleanup";
import { createLocalE2EPassword, prepareLocalE2EState } from "../../scripts/e2e-local-state";
import { loadLocalE2EState } from "../e2e/local-state";

const emulatorReady = process.env.FIREBASE_EMULATORS === "true"
  && Boolean(process.env.FIREBASE_PROJECT_ID)
  && Boolean(process.env.FIRESTORE_EMULATOR_HOST)
  && Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

if (!emulatorReady) {
  console.warn("[E2E Emulator] prueba omitida: Firebase Emulator no esta configurado.");
}

const describeWhenReady = emulatorReady ? describe : describe.skip;

describeWhenReady("estado E2E contra Firebase Emulator", () => {
  it("crea y elimina el contrato completo sin borrar documentos ajenos", async () => {
    const state = await prepareLocalE2EState();
    const { getAdminDb } = await import("../../src/lib/firebase-admin");
    const db = getAdminDb();
    const plan = getLocalE2EResourcePlan(state);
    const ownedOrderId = `e2e-order-${state.runId}`;
    const ownedAuditId = `e2e-audit-${state.runId}`;
    const ownedNotificationId = `e2e-notification-${state.runId}`;
    const unrelatedOrderId = `unrelated-order-${state.runId}`;

    try {
      for (const resource of plan) {
        expect((await db.collection(resource.collection).doc(resource.id).get()).exists).toBe(true);
      }
      expect(loadLocalE2EState()).toEqual(state);

      await db.collection("pedidos").doc(ownedOrderId).set({ clienteUid: state.customer.uid });
      await db.collection("auditoria").doc(ownedAuditId).set({ actorUid: state.staff.uid });
      await db.collection("notificaciones").doc(ownedNotificationId).set({ uid: state.customer.uid });
      await db.collection("pedidos").doc(unrelatedOrderId).set({ clienteUid: "cliente-ajeno" });
    } finally {
      await cleanupLocalE2EState(state);
    }

    for (const resource of plan) {
      expect((await db.collection(resource.collection).doc(resource.id).get()).exists).toBe(false);
    }
    expect((await db.collection("pedidos").doc(ownedOrderId).get()).exists).toBe(false);
    expect((await db.collection("auditoria").doc(ownedAuditId).get()).exists).toBe(false);
    expect((await db.collection("notificaciones").doc(ownedNotificationId).get()).exists).toBe(false);
    expect((await db.collection("pedidos").doc(unrelatedOrderId).get()).exists).toBe(true);
    expect(existsSync(".tmp/e2e/local-state.json")).toBe(false);
  }, 30_000);

  it("falla cerrado si el claim e2eRunId no coincide y no borra datos", async () => {
    const state = await prepareLocalE2EState();
    const { getAdminAuth, getAdminDb } = await import("../../src/lib/firebase-admin");
    const auth = getAdminAuth();
    const db = getAdminDb();

    try {
      await auth.setCustomUserClaims(state.customer.uid, { e2eRunId: "e2e-otro-run" });
      await expect(cleanupLocalE2EState(state)).rejects.toThrow("claim e2eRunId");
      expect((await db.collection("users").doc(state.customer.uid).get()).exists).toBe(true);
    } finally {
      await auth.setCustomUserClaims(state.customer.uid, { e2eRunId: state.runId });
      await cleanupLocalE2EState(state);
    }
  }, 30_000);

  it("revierte los usuarios Auth si falla la asignacion inicial de claims", async () => {
    const { getAdminAuth } = await import("../../src/lib/firebase-admin");
    const auth = getAdminAuth();
    const unrelatedUser = await auth.createUser({
      email: "unrelated@local.test",
      password: createLocalE2EPassword(),
    });
    const claimFailure = vi.spyOn(auth, "setCustomUserClaims").mockImplementationOnce(async () => {
      throw new Error("fallo de claims provocado");
    });

    try {
      await expect(prepareLocalE2EState()).rejects.toThrow("fallo de claims provocado");
      const users = (await auth.listUsers()).users;
      expect(users.map((user) => user.uid)).toContain(unrelatedUser.uid);
      expect(users.filter((user) => user.email?.endsWith("@local.test") && user.uid !== unrelatedUser.uid)).toHaveLength(0);
    } finally {
      claimFailure.mockRestore();
      await auth.deleteUser(unrelatedUser.uid);
    }
  }, 30_000);

  it("revierte Auth y perfiles si falla la creacion de un recurso propio", async () => {
    const { getAdminAuth, getAdminDb } = await import("../../src/lib/firebase-admin");
    const auth = getAdminAuth();
    const db = getAdminDb();
    const blocker = db.collection("roles").doc("customer");

    await blocker.set({ origen: "ajeno" });
    try {
      await expect(prepareLocalE2EState()).rejects.toThrow();
      expect((await auth.listUsers()).users).toHaveLength(0);
      expect((await db.collection("users").where("e2eManaged", "==", true).get()).docs).toHaveLength(0);
      expect((await blocker.get()).data()).toEqual({ origen: "ajeno" });
      expect(existsSync(".tmp/e2e/local-state.json")).toBe(false);
    } finally {
      await blocker.delete();
    }
  }, 30_000);
});
