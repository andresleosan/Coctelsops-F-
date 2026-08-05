import "server-only";

import { z } from "zod";

import { getAdminDb } from "@/lib/firebase-admin";
import { writeAuditInTransaction } from "@/lib/firestore/audit";
import { DEFAULT_STORE_CONFIGURATION, type StoreConfiguration } from "@/types/operations";

export { DEFAULT_STORE_CONFIGURATION } from "@/types/operations";

const timeSchema = z.string().refine((value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match !== null && Number(match[1]) <= 23 && Number(match[2]) <= 59;
}, "La hora debe estar entre 00:00 y 23:59");

export const storeConfigurationSchema = z.object({
  whatsappNumber: z.string().trim().regex(/^\d{10,15}$/, "El WhatsApp debe ser un número internacional"),
  businessHours: z.array(z.object({ day: z.string().trim().min(1), open: timeSchema, close: timeSchema, closed: z.boolean().optional() })).length(7),
  deliveryZones: z.array(z.string().trim().min(1)).min(1).max(50),
  estimatedDeliveryMinutes: z.number().int().min(1).max(240),
  messages: z.object({ orderReceived: z.string().trim().min(1).max(300), orderStatus: z.string().trim().min(1).max(300), unavailable: z.string().trim().min(1).max(300) }),
});

function parseConfiguration(data: Record<string, unknown> | undefined): StoreConfiguration {
  const candidate = { ...DEFAULT_STORE_CONFIGURATION, ...(data ?? {}), messages: { ...DEFAULT_STORE_CONFIGURATION.messages, ...((data?.messages as Record<string, unknown> | undefined) ?? {}) } };
  const parsed = storeConfigurationSchema.safeParse(candidate);
  return parsed.success ? parsed.data : DEFAULT_STORE_CONFIGURATION;
}

export async function getStoreConfiguration(): Promise<StoreConfiguration> {
  const snapshot = await getAdminDb().collection("configuracion").doc("principal").get();
  return parseConfiguration(snapshot.exists ? snapshot.data() as Record<string, unknown> : undefined);
}

export async function updateStoreConfiguration(input: StoreConfiguration, actorUid: string): Promise<StoreConfiguration> {
  const validated = storeConfigurationSchema.parse(input);
  const data = { ...validated, updatedAt: new Date().toISOString() };
  const db = getAdminDb();
  const reference = db.collection("configuracion").doc("principal");
  await db.runTransaction(async (transaction) => {
    transaction.set(reference, data, { merge: true });
    writeAuditInTransaction(transaction, { actorUid, action: "update", module: "configuracion", entityId: "principal", changes: validated });
  });
  return data;
}
