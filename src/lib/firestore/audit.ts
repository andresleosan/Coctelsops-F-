import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";

export type AuditInput = {
  actorUid: string;
  action: string;
  module: string;
  entityId: string;
  changes?: Record<string, unknown>;
};

export async function createAuditEntry(input: AuditInput): Promise<void> {
  await getAdminDb().collection("auditoria").add({
    ...input,
    createdAt: new Date().toISOString(),
  });
}
