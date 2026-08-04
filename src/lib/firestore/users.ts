import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import { createAuditEntry } from "@/lib/firestore/audit";
import type { AccountType, AuthProfile, UserProfile } from "@/types/auth";

const accountTypes = new Set<AccountType>(["customer", "staff", "admin"]);

function toProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    telefono: typeof data.telefono === "string" ? data.telefono : null,
    addresses: Array.isArray(data.addresses) ? data.addresses : [],
    active: data.active !== false,
    accountType: accountTypes.has(data.accountType as AccountType) ? (data.accountType as AccountType) : "customer",
    roleIds: Array.isArray(data.roleIds) ? data.roleIds.filter((role): role is string => typeof role === "string") : ["customer"],
    permissions: Array.isArray(data.permissions) ? data.permissions.filter((permission): permission is `${string}.${string}` => typeof permission === "string") : [],
    createdAt: (data.createdAt as UserProfile["createdAt"]) ?? new Date().toISOString(),
    lastLoginAt: (data.lastLoginAt as UserProfile["lastLoginAt"]) ?? new Date().toISOString(),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  return snapshot.exists ? toProfile(uid, (snapshot.data() ?? {}) as Record<string, unknown>) : null;
}

export async function syncUser(uid: string, data: AuthProfile): Promise<UserProfile> {
  const ref = getAdminDb().collection("users").doc(uid);
  const existing = await ref.get();
  const current = existing.exists ? toProfile(uid, (existing.data() ?? {}) as Record<string, unknown>) : null;
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL,
    telefono: current?.telefono ?? null,
    addresses: current?.addresses ?? [],
    active: current?.active ?? true,
    accountType: current?.accountType ?? "customer",
    roleIds: current?.roleIds?.length ? current.roleIds : ["customer"],
    permissions: current?.permissions ?? [],
    createdAt: current?.createdAt ?? now,
    lastLoginAt: now,
  };

  await ref.set(profile, { merge: true });
  return profile;
}

export async function listUsers(): Promise<UserProfile[]> {
  const snapshot = await getAdminDb().collection("users").get();
  return snapshot.docs.map((doc) => toProfile(doc.id, (doc.data() ?? {}) as Record<string, unknown>));
}

export async function updateUser(uid: string, input: { active?: boolean; roleIds?: string[] }): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.active !== undefined) updates.active = input.active;
  if (input.roleIds !== undefined) updates.roleIds = input.roleIds;
  await getAdminDb().collection("users").doc(uid).update(updates);
}

export async function auditUserMutation(actorUid: string, uid: string, changes: Record<string, unknown>): Promise<void> {
  await createAuditEntry({ actorUid, action: "update", module: "usuarios", entityId: uid, changes });
}
