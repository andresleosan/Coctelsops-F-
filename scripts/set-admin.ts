import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

async function main(): Promise<void> {
  const uid = process.argv[2]?.trim();
  if (!uid) {
    throw new Error("Uso: npx tsx scripts/set-admin.ts <UID>");
  }

  const auth = getAdminAuth();
  const firebaseUser = await auth.getUser(uid);
  const claims = { ...(firebaseUser.customClaims ?? {}), admin: true };
  await auth.setCustomUserClaims(uid, claims);

  const ref = getAdminDb().collection("users").doc(uid);
  const existing = await ref.get();
  await ref.set({
    uid,
    email: firebaseUser.email ?? "",
    displayName: firebaseUser.displayName ?? null,
    photoURL: firebaseUser.photoURL ?? null,
    active: true,
    accountType: "admin",
    roleIds: ["admin"],
    ...(existing.exists ? {} : { telefono: null, addresses: [], createdAt: new Date().toISOString() }),
    lastLoginAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`Administrador configurado para ${uid}.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No fue posible configurar el administrador");
  process.exitCode = 1;
});
