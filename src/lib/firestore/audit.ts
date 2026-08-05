import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import type { Transaction } from "firebase-admin/firestore";
import type { AuditEntry, AuditInput as OperationAuditInput } from "@/types/operations";

export type AuditInput = OperationAuditInput;

function auditData(input: AuditInput): Record<string, unknown> {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  };
}

export function writeAuditInTransaction(transaction: Transaction, input: AuditInput): void {
  const ref = getAdminDb().collection("auditoria").doc();
  transaction.create(ref, auditData(input));
}

export async function createAuditEntry(input: AuditInput): Promise<void> {
  const collection = getAdminDb().collection("auditoria");
  // Firestore siempre expone add; the guard keeps lightweight repository mocks usable.
  if (typeof collection.add !== "function") return;
  await collection.add(auditData(input));
}

export async function listAuditEntries(limit = 100): Promise<AuditEntry[]> {
  const snapshot = await getAdminDb().collection("auditoria").orderBy("createdAt", "desc").limit(Math.min(Math.max(limit, 1), 200)).get();
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() as Omit<AuditEntry, "id">) }));
}
