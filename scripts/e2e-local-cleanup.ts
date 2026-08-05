import { existsSync, unlinkSync } from "node:fs";

import { assertLoopbackEmulatorHosts } from "../src/firebase/emulators";
import { getCleanupSafetyError } from "../tests/e2e/cleanup-safety";
import {
  getLocalE2EStatePath,
  isLocalE2EState,
  type LocalE2EState,
} from "./e2e-local-state";

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

async function deleteCollection(db: FirebaseFirestore.Firestore, collectionName: string): Promise<void> {
  const snapshot = await db.collection(collectionName).get();
  let batch = db.batch();
  let pending = 0;

  for (const document of snapshot.docs) {
    batch.delete(document.ref);
    pending += 1;
    if (pending === 500) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
}

export async function cleanupLocalE2EState(state: LocalE2EState): Promise<void> {
  assertCleanupEnvironment();
  if (!isLocalE2EState(state)) {
    throw new Error("El estado E2E no tiene el formato esperado.");
  }

  const [{ getAdminAuth, getAdminDb }] = await Promise.all([
    import("../src/lib/firebase-admin"),
  ]);
  const auth = getAdminAuth();
  const db = getAdminDb();

  await Promise.all([
    deleteCollection(db, "pedidos"),
    deleteCollection(db, "auditoria"),
    deleteCollection(db, "notificaciones"),
  ]);
  await Promise.all(Object.values(state).map((user) => db.collection("users").doc(user.uid).delete()));
  await Promise.all(Object.values(state).map((user) => auth.deleteUser(user.uid)));

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
