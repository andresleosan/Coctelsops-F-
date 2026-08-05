import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import type { Notification, NotificationInput } from "@/types/operations";

export async function createNotification(input: NotificationInput): Promise<string> {
  const reference = getAdminDb().collection("notificaciones").doc();
  const data = { ...input, read: input.read ?? false, createdAt: new Date().toISOString() };
  await reference.set(data);
  return reference.id;
}

function toNotification(id: string, data: Record<string, unknown>): Notification {
  return {
    id,
    uid: typeof data.uid === "string" ? data.uid : undefined,
    audience: data.audience === "admin" ? "admin" : "customer",
    title: typeof data.title === "string" ? data.title : "Notificación",
    message: typeof data.message === "string" ? data.message : "Tienes una actualización.",
    orderId: typeof data.orderId === "string" ? data.orderId : undefined,
    read: data.read === true,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
  };
}

export async function listNotifications(uid: string): Promise<Notification[]> {
  const snapshot = await getAdminDb().collection("notificaciones").where("uid", "==", uid).orderBy("createdAt", "desc").limit(50).get();
  return snapshot.docs.map((document) => toNotification(document.id, document.data() as Record<string, unknown>));
}

export async function listAdminNotifications(): Promise<Notification[]> {
  const snapshot = await getAdminDb().collection("notificaciones").where("audience", "==", "admin").orderBy("createdAt", "desc").limit(50).get();
  return snapshot.docs.map((document) => toNotification(document.id, document.data() as Record<string, unknown>));
}

export async function markNotificationRead(id: string, uid: string, admin = false): Promise<void> {
  const reference = getAdminDb().collection("notificaciones").doc(id);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new Error("Notificación no encontrada");
  const notification = toNotification(id, snapshot.data() as Record<string, unknown>);
  if (!admin && notification.uid !== uid) throw new Error("No tienes permiso para actualizar esta notificación");
  await reference.update({ read: true });
}
