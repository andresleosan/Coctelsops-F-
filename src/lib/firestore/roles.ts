import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import { createAuditEntry, writeAuditInTransaction } from "@/lib/firestore/audit";
import type { Permission, Role, RoleInput } from "@/types/auth";
import { AuthorizationError } from "@/lib/auth/verify-request";

function roleId(name: string): string {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toRole(id: string, data: Record<string, unknown>): Role {
  return {
    id,
    name: typeof data.name === "string" ? data.name : id,
    description: typeof data.description === "string" ? data.description : "",
    active: data.active !== false,
    permissions: Array.isArray(data.permissions) ? data.permissions.filter((permission): permission is Permission => typeof permission === "string" && /^[^.]+\.[^.]+$/.test(permission)) : [],
    createdAt: (data.createdAt as Role["createdAt"]) ?? new Date().toISOString(),
    updatedAt: (data.updatedAt as Role["updatedAt"]) ?? new Date().toISOString(),
  };
}

async function assertAdministratorReplacement(id: string, next?: RoleInput): Promise<void> {
  const role = await getRole(id);
  if (!role || (!role.id.toLocaleLowerCase().includes("admin") && !role.name.toLocaleLowerCase().includes("admin"))) return;
  const removesAccess = !next || !next.active || !next.permissions.includes("roles.write");
  if (!removesAccess) return;
  const snapshot = await getAdminDb().collection("users").where("roleIds", "array-contains", id).where("active", "==", true).get();
  if (snapshot.size <= 1) throw new AuthorizationError(409, "Debes conservar un administrador activo o crear un reemplazo primero");
}

export async function listRoles(): Promise<Role[]> {
  const snapshot = await getAdminDb().collection("roles").get();
  return snapshot.docs.map((doc) => toRole(doc.id, (doc.data() ?? {}) as Record<string, unknown>));
}

export async function getRole(id: string): Promise<Role | null> {
  const snapshot = await getAdminDb().collection("roles").doc(id).get();
  return snapshot.exists ? toRole(id, (snapshot.data() ?? {}) as Record<string, unknown>) : null;
}

export async function createRole(input: RoleInput, actorUid = "system"): Promise<string> {
  const id = roleId(input.name);
  if (!id) throw new Error("El nombre del rol no es válido");
  const db = getAdminDb();
  const ref = db.collection("roles").doc(id);
  const now = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) throw new Error("El rol ya existe");
    transaction.create(ref, { ...input, createdAt: now, updatedAt: now });
    writeAuditInTransaction(transaction, { actorUid, action: "create", module: "roles", entityId: id, changes: input });
  });
  return id;
}

export async function updateRole(id: string, input: RoleInput, actorUid = "system"): Promise<void> {
  await assertAdministratorReplacement(id, input);
  const db = getAdminDb();
  const ref = db.collection("roles").doc(id);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (!existing.exists) throw new Error("Rol no encontrado");
    transaction.update(ref, { ...input, updatedAt: new Date().toISOString() });
    writeAuditInTransaction(transaction, { actorUid, action: "update", module: "roles", entityId: id, changes: input });
  });
}

export async function deleteRole(id: string, actorUid = "system"): Promise<void> {
  await assertAdministratorReplacement(id);
  const db = getAdminDb();
  const ref = db.collection("roles").doc(id);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (!existing.exists) throw new Error("Rol no encontrado");
    transaction.delete(ref);
    writeAuditInTransaction(transaction, { actorUid, action: "delete", module: "roles", entityId: id, changes: {} });
  });
}

export async function auditRoleMutation(actorUid: string, id: string, action: string, changes: Record<string, unknown>): Promise<void> {
  await createAuditEntry({ actorUid, action, module: "roles", entityId: id, changes });
}
