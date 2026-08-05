import type { Order, OrderItem, OrderStatus } from "../src/types/orders";
import { getSeedAdminDb } from "./firebase-admin";

export type LegacyOrder = {
  [key: string]: unknown;
  customerName?: unknown;
  phone?: unknown;
  address?: unknown;
  notes?: unknown;
  items?: unknown;
  total?: unknown;
  subtotal?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  clienteUid?: unknown;
  audit?: unknown;
};

type DocumentSnapshotLike = {
  id: string;
  exists?: boolean;
  data(): unknown;
};

type DocumentReferenceLike = {
  get(): Promise<{ exists?: boolean; data(): unknown }>;
  set(data: Record<string, unknown>): Promise<unknown>;
};

type CollectionLike = {
  get(): Promise<{ docs: DocumentSnapshotLike[] }>;
  doc(id: string): DocumentReferenceLike;
};

export type MigrationDb = {
  collection(name: string): CollectionLike;
};

export type MigrationOptions = {
  db?: MigrationDb;
  sourceCollection?: string;
  targetCollection?: string;
  logger?: Pick<Console, "log" | "error">;
};

export type MigrationSummary = {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; message: string }>;
};

export type MigrationMismatch = {
  id: string;
  field: "id" | "total" | "itemCount" | "status" | "createdAt";
  source?: unknown;
  target?: unknown;
};

export type MigrationVerification = {
  ok: boolean;
  sourceCount: number;
  targetCount: number;
  missingIds: string[];
  extraIds: string[];
  mismatches: MigrationMismatch[];
};

const statusAliases: Record<string, OrderStatus> = {
  pendiente: "pendiente",
  confirmado: "confirmado",
  preparando: "preparando",
  "en camino": "en_camino",
  en_camino: "en_camino",
  enviado: "en_camino",
  entregado: "entregado",
  completado: "entregado",
  cancelado: "cancelado",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  const timestamp = asRecord(value);
  if (typeof timestamp.toDate === "function") {
    const date = timestamp.toDate();
    if (date instanceof Date) return date.toISOString();
  }
  return "";
}

export function mapLegacyStatus(value: unknown): OrderStatus {
  const normalized = String(value ?? "").trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const status = statusAliases[normalized];
  if (!status) throw new Error(`Estado legado no reconocido: ${String(value)}`);
  return status;
}

function mapLegacyItem(value: unknown): OrderItem {
  const item = asRecord(value);
  const quantity = asNumber(item.quantity);
  const unitPrice = asNumber(item.unitPrice, asNumber(item.price));
  const subtotal = asNumber(item.subtotal, unitPrice * quantity);
  const customization = asRecord(item.customization);

  return {
    ...item,
    productId: String(item.productId ?? ""),
    name: String(item.name ?? "Producto"),
    quantity,
    unitPrice,
    subtotal,
    customization: {
      size: customization.size === "Small" || customization.size === "Large" ? customization.size : "Medium",
      flavors: Array.isArray(customization.flavors) ? customization.flavors.map(String) : [],
      addOns: Array.isArray(customization.addOns) ? customization.addOns.map(String) : [],
    },
  } as OrderItem;
}

export function mapLegacyOrder(id: string, data: LegacyOrder): Order {
  const status = mapLegacyStatus(data.status);
  const createdAt = toIso(data.createdAt);
  const updatedAt = toIso(data.updatedAt) || createdAt;
  const clienteUid = typeof data.clienteUid === "string" ? data.clienteUid : "";
  const items = Array.isArray(data.items) ? data.items.map(mapLegacyItem) : [];
  const total = asNumber(data.total);
  const subtotal = asNumber(data.subtotal, total);
  const sourceAudit = asRecord(data.audit);

  return {
    ...data,
    id,
    clienteUid,
    customerName: String(data.customerName ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
    ...(typeof data.notes === "string" ? { notes: data.notes } : {}),
    items,
    subtotal,
    total,
    status,
    createdAt,
    updatedAt,
    audit: Object.keys(sourceAudit).length > 0 ? sourceAudit : { createdByUid: clienteUid || "historical-migration", createdAt },
    legacy: true,
    historical: !clienteUid,
  } as Order;
}

function isExisting(snapshot: { exists?: boolean; data(): unknown }): boolean {
  return snapshot.exists === true || snapshot.data() !== undefined;
}

function getDb(options: MigrationOptions): MigrationDb {
  return options.db ?? getSeedAdminDb() as unknown as MigrationDb;
}

export async function migrateLegacyOrders(options: MigrationOptions = {}): Promise<MigrationSummary> {
  const sourceName = options.sourceCollection ?? "orders";
  const targetName = options.targetCollection ?? "pedidos";
  const logger = options.logger;
  const sourceDocuments = await getDb(options).collection(sourceName).get();
  const summary: MigrationSummary = { total: sourceDocuments.docs.length, migrated: 0, skipped: 0, failed: 0, errors: [] };

  for (const document of sourceDocuments.docs) {
    try {
      const target = getDb(options).collection(targetName).doc(document.id);
      if (isExisting(await target.get())) {
        summary.skipped += 1;
        continue;
      }
      await target.set(mapLegacyOrder(document.id, asRecord(document.data()) as LegacyOrder));
      summary.migrated += 1;
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({ id: document.id, message: error instanceof Error ? error.message : "Error desconocido" });
    }
  }

  logger?.log(`Migración de pedidos: ${summary.migrated} migrados, ${summary.skipped} omitidos, ${summary.failed} fallidos.`);
  if (summary.errors.length > 0) logger?.error(summary.errors);
  return summary;
}

export async function verifyMigration(options: MigrationOptions = {}): Promise<MigrationVerification> {
  const sourceName = options.sourceCollection ?? "orders";
  const targetName = options.targetCollection ?? "pedidos";
  const db = getDb(options);
  const [sourceSnapshot, targetSnapshot] = await Promise.all([
    db.collection(sourceName).get(),
    db.collection(targetName).get(),
  ]);
  const source = new Map(sourceSnapshot.docs.map((document) => [document.id, asRecord(document.data()) as LegacyOrder]));
  const target = new Map(targetSnapshot.docs
    .map((document) => [document.id, asRecord(document.data())] as const)
    .filter(([, data]) => data.legacy === true));
  const missingIds = [...source.keys()].filter((id) => !target.has(id));
  const extraIds = [...target.keys()].filter((id) => !source.has(id));
  const mismatches: MigrationMismatch[] = [];

  for (const [id, sourceData] of source) {
    const targetData = target.get(id);
    if (!targetData) continue;
    const expected = mapLegacyOrder(id, sourceData);
    if (targetData.id !== expected.id) mismatches.push({ id, field: "id", source: expected.id, target: targetData.id });
    if (targetData.total !== expected.total) mismatches.push({ id, field: "total", source: expected.total, target: targetData.total });
    const targetItemCount = Array.isArray(targetData.items) ? targetData.items.length : 0;
    if (targetItemCount !== expected.items.length) mismatches.push({ id, field: "itemCount", source: expected.items.length, target: targetItemCount });
    if (targetData.status !== expected.status) mismatches.push({ id, field: "status", source: expected.status, target: targetData.status });
    if (targetData.createdAt !== expected.createdAt) mismatches.push({ id, field: "createdAt", source: expected.createdAt, target: targetData.createdAt });
  }

  return {
    ok: source.size === target.size && missingIds.length === 0 && extraIds.length === 0 && mismatches.length === 0,
    sourceCount: source.size,
    targetCount: target.size,
    missingIds,
    extraIds,
    mismatches,
  };
}

if (require.main === module) {
  migrateLegacyOrders()
    .then((summary) => {
      if (summary.failed > 0) process.exitCode = 1;
    })
    .catch((error: unknown) => {
      console.error("No fue posible migrar los pedidos", error instanceof Error ? error.message : "Error desconocido");
      process.exitCode = 1;
    });
}
