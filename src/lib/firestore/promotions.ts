import "server-only";

import { z } from "zod";

import { getAdminDb } from "@/lib/firebase-admin";
import { createAuditEntry } from "@/lib/firestore/audit";
import type { Promotion, PromotionContext, PromotionInput, PromotionResult } from "@/types/operations";

export const promotionInputSchema = z.object({
  code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
  active: z.boolean(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  minimumSubtotal: z.number().nonnegative(),
  productIds: z.array(z.string().trim().min(1)).max(100).optional(),
  categoryIds: z.array(z.string().trim().min(1)).max(30).optional(),
  usageLimit: z.number().int().positive().optional(),
  usageCount: z.number().int().nonnegative().optional(),
  maxDiscount: z.number().positive().optional(),
}).superRefine((value, context) => {
  if (value.endsAt <= value.startsAt) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "La fecha final debe ser posterior a la inicial" });
  if (value.discountType === "percent" && value.discountValue > 100) context.addIssue({ code: z.ZodIssueCode.custom, path: ["discountValue"], message: "El porcentaje no puede superar 100" });
  if (value.usageLimit !== undefined && (value.usageCount ?? 0) > value.usageLimit) context.addIssue({ code: z.ZodIssueCode.custom, path: ["usageCount"], message: "El uso actual supera el límite" });
});

function toPromotion(id: string, data: Record<string, unknown>): Promotion {
  const validated = promotionInputSchema.parse({ ...data, usageCount: data.usageCount ?? 0 });
  return { id, ...validated, usageCount: validated.usageCount ?? 0 };
}

export function calculatePromotion(input: PromotionContext): PromotionResult {
  const { promotion, subtotal, items } = input;
  const now = input.now ?? new Date().toISOString();
  const inactive = !promotion.active;
  if (inactive) return { applied: false, discount: 0, total: subtotal, code: promotion.code, reason: "inactiva" };
  if (!Number.isFinite(subtotal) || subtotal < 0 || now < promotion.startsAt || now > promotion.endsAt) return { applied: false, discount: 0, total: subtotal, code: promotion.code, reason: "vencida" };
  if (subtotal < promotion.minimumSubtotal) return { applied: false, discount: 0, total: subtotal, code: promotion.code, reason: "mínimo" };
  if (promotion.usageLimit !== undefined && promotion.usageCount >= promotion.usageLimit) return { applied: false, discount: 0, total: subtotal, code: promotion.code, reason: "límite" };
  const scoped = Boolean(promotion.productIds?.length || promotion.categoryIds?.length);
  const eligible = items.filter((item) => (!promotion.productIds?.length || promotion.productIds.includes(item.productId)) && (!promotion.categoryIds?.length || promotion.categoryIds.includes(item.category)));
  if (scoped && eligible.length === 0) return { applied: false, discount: 0, total: subtotal, code: promotion.code, reason: "alcance" };
  const eligibleSubtotal = scoped ? eligible.reduce((sum, item) => sum + Math.max(0, item.subtotal), 0) : subtotal;
  const rawDiscount = promotion.discountType === "percent" ? eligibleSubtotal * (promotion.discountValue / 100) : promotion.discountValue;
  const discount = Math.min(Math.round(rawDiscount), Math.round(eligibleSubtotal), promotion.maxDiscount === undefined ? Number.MAX_SAFE_INTEGER : Math.round(promotion.maxDiscount));
  return { applied: true, discount, total: Math.max(0, Math.round(subtotal - discount)), code: promotion.code };
}

export async function getPromotionByCode(code: string): Promise<Promotion | null> {
  const snapshot = await getAdminDb().collection("promociones").where("code", "==", code.trim().toUpperCase()).limit(1).get();
  const document = snapshot.docs[0];
  return document ? toPromotion(document.id, document.data() as Record<string, unknown>) : null;
}

export async function listPromotions(): Promise<Promotion[]> {
  const snapshot = await getAdminDb().collection("promociones").orderBy("startsAt", "desc").limit(100).get();
  return snapshot.docs.map((document) => toPromotion(document.id, document.data() as Record<string, unknown>));
}

export async function createPromotion(input: PromotionInput, actorUid: string): Promise<string> {
  const validated = promotionInputSchema.parse(input);
  const reference = getAdminDb().collection("promociones").doc();
  const data = { ...validated, usageCount: validated.usageCount ?? 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await reference.set(data);
  await createAuditEntry({ actorUid, action: "create", module: "promociones", entityId: reference.id, changes: data });
  return reference.id;
}

export async function updatePromotion(id: string, input: PromotionInput, actorUid: string): Promise<void> {
  const validated = promotionInputSchema.parse(input);
  await getAdminDb().collection("promociones").doc(id).update({ ...validated, usageCount: validated.usageCount ?? 0, updatedAt: new Date().toISOString() });
  await createAuditEntry({ actorUid, action: "update", module: "promociones", entityId: id, changes: validated });
}

export async function deletePromotion(id: string, actorUid: string): Promise<void> {
  await getAdminDb().collection("promociones").doc(id).delete();
  await createAuditEntry({ actorUid, action: "delete", module: "promociones", entityId: id });
}
