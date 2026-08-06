import { existsSync, unlinkSync } from "node:fs";

import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

import { assertLoopbackEmulatorHosts } from "../src/firebase/emulators";
import { getCleanupSafetyError } from "../tests/e2e/cleanup-safety";
import {
  getLocalE2EResourcePlan,
  getLocalE2EStatePath,
  isLocalE2EState,
  LOCAL_E2E_ROLES,
  LOCAL_E2E_OWNERSHIP_FIELD,
  type LocalE2EResourceRef,
  type LocalE2EState,
} from "./e2e-local-state";

export { getLocalE2EResourcePlan } from "./e2e-local-state";

function assertCleanupEnvironment(): void {
  const safetyError = getCleanupSafetyError(process.env);
  if (safetyError) throw new Error(safetyError);
  if (process.env.E2E_CLEANUP !== "true") {
    throw new Error("La limpieza E2E requiere E2E_CLEANUP=true.");
  }
  if (process.env.FIREBASE_EMULATORS !== "true") {
    throw new Error("La limpieza E2E solo puede ejecutarse con FIREBASE_EMULATORS=true.");
  }
  assertLoopbackEmulatorHosts(process.env);
}

type CleanupOptions = {
  resourceKeys?: ReadonlySet<string>;
};

function resourceKey(resource: LocalE2EResourceRef): string {
  return `${resource.collection}/${resource.id}`;
}

async function deleteReferences(db: Firestore, references: FirebaseFirestore.DocumentReference[]): Promise<void> {
  let batch = db.batch();
  let pending = 0;

  for (const reference of references) {
    batch.delete(reference);
    pending += 1;
    if (pending === 500) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
}

async function getOwnedResourceReferences(db: Firestore, state: LocalE2EState, options: CleanupOptions): Promise<FirebaseFirestore.DocumentReference[]> {
  const plan = getLocalE2EResourcePlan(state).filter((resource) => !options.resourceKeys || options.resourceKeys.has(resourceKey(resource)));
  const snapshots = await Promise.all(plan.map(async (resource) => {
    const reference = db.collection(resource.collection).doc(resource.id);
    return { reference, snapshot: await reference.get() };
  }));
  const owned: FirebaseFirestore.DocumentReference[] = [];

  for (const { reference, snapshot } of snapshots) {
    if (!snapshot.exists) continue;
    const data = snapshot.data() as Record<string, unknown> | undefined;
    if (data?.[LOCAL_E2E_OWNERSHIP_FIELD] !== state.runId || data.e2eManaged !== true) {
      throw new Error(`El documento ${reference.path} no pertenece al estado E2E; cleanup abortado sin borrar.`);
    }
    owned.push(reference);
  }

  return owned;
}

async function getOwnedAuthUsers(auth: Auth, state: LocalE2EState): Promise<string[]> {
  const owned: string[] = [];
  for (const role of LOCAL_E2E_ROLES) {
    try {
      const user = await auth.getUser(state[role].uid);
      const customClaims = user.customClaims as Record<string, unknown> | undefined;
      if (customClaims?.e2eRunId !== state.runId) {
        throw new Error(`El usuario Auth ${state[role].uid} no tiene el claim e2eRunId esperado; cleanup abortado sin borrar.`);
      }
      if (user.email !== state[role].email) {
        throw new Error(`El usuario Auth ${state[role].uid} no coincide con el estado E2E; cleanup abortado sin borrar.`);
      }
      owned.push(user.uid);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") continue;
      throw error;
    }
  }
  return owned;
}

async function findReferencesByField(db: Firestore, collectionName: string, field: string, values: string[]): Promise<FirebaseFirestore.DocumentReference[]> {
  const references: FirebaseFirestore.DocumentReference[] = [];
  for (const value of values) {
    const snapshot = await db.collection(collectionName).where(field, "==", value).get();
    references.push(...snapshot.docs.map((document) => document.ref));
  }
  return references;
}

function uniqueReferences(references: FirebaseFirestore.DocumentReference[]): FirebaseFirestore.DocumentReference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    if (seen.has(reference.path)) return false;
    seen.add(reference.path);
    return true;
  });
}

export async function deleteOwnedLocalE2EData(auth: Auth, db: Firestore, state: LocalE2EState, options: CleanupOptions = {}): Promise<void> {
  if (!isLocalE2EState(state)) {
    throw new Error("El estado E2E no tiene el formato esperado.");
  }

  const ownedResources = await getOwnedResourceReferences(db, state, options);
  const ownedAuthUsers = await getOwnedAuthUsers(auth, state);
  const userIds = [state.customer.uid, state.staff.uid, state.admin.uid];
  const ownedOrders = await findReferencesByField(db, "pedidos", "clienteUid", userIds);
  const orderIds = ownedOrders.map((reference) => reference.id);
  const ownedInventoryMovements = await findReferencesByField(db, "inventario_movimientos", "orderId", orderIds);
  const ownedNotifications = await findReferencesByField(db, "notificaciones", "uid", userIds);
  const ownedAudits = await findReferencesByField(db, "auditoria", "actorUid", userIds);

  for (const orderId of orderIds) {
    ownedNotifications.push(...await findReferencesByField(db, "notificaciones", "orderId", [orderId]));
  }

  await deleteReferences(db, uniqueReferences([
    ...ownedResources,
    ...ownedOrders,
    ...ownedInventoryMovements,
    ...ownedNotifications,
    ...ownedAudits,
  ]));
  await Promise.all(ownedAuthUsers.map((uid) => auth.deleteUser(uid)));
}

export async function cleanupLocalE2EState(state: LocalE2EState): Promise<void> {
  assertCleanupEnvironment();
  if (!isLocalE2EState(state)) {
    throw new Error("El estado E2E no tiene el formato esperado.");
  }

  const { getAdminAuth, getAdminDb } = await import("../src/lib/firebase-admin");
  const auth = getAdminAuth();
  const db = getAdminDb();
  await deleteOwnedLocalE2EData(auth, db, state);

  const stateFile = getLocalE2EStatePath();
  if (existsSync(stateFile)) unlinkSync(stateFile);
}

if (require.main === module) {
  import("../tests/e2e/local-state")
    .then(({ loadLocalE2EState }) => {
      const state = loadLocalE2EState();
      if (!state) throw new Error("No existe un estado E2E local para limpiar.");
      return cleanupLocalE2EState(state);
    })
    .then(() => console.log("Estado E2E local eliminado."))
    .catch((error: unknown) => {
      console.error("No fue posible limpiar el estado E2E local", error instanceof Error ? error.message : "Error desconocido");
      process.exitCode = 1;
    });
}
