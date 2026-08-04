import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import type { Transaction } from "firebase-admin/firestore";

export type AuditInput = {
  actorUid: string;
  action: string;
  module: string;
  entityId: string;
  changes?: Record<string, unknown>;
};

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
  await getAdminDb().collection("auditoria").add(auditData(input));
}
