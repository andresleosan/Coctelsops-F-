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
};

type CollectionLike = {
  get(): Promise<{ docs: DocumentSnapshotLike[] }>;
  doc(id: string): DocumentReferenceLike;
};

type TransactionLike = {
  get(reference: DocumentReferenceLike): Promise<{ exists?: boolean; data(): unknown }>;
  create(reference: DocumentReferenceLike, data: Record<string, unknown>): unknown;
};

export type MigrationDb = {
  collection(name: string): CollectionLike;
  runTransaction<T>(callback: (transaction: TransactionLike) => Promise<T>): Promise<T>;
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
  field: string;
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

function requiredNumber(value: unknown, field: string, options: { integer?: boolean; min?: number } = {}): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} legado debe ser un número finito`);
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new Error(`${field} legado debe ser un número entero`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`${field} legado debe ser mayor o igual a ${options.min}`);
  }
  return value;
}

function toIso(value: unknown, field: string, optional = false): string {
  if (value === undefined || value === null || value === "") {
    if (optional) return "";
    throw new Error(`${field} legado es obligatorio`);
  }
  if (typeof value === "string") {
    if (!value.trim()) throw new Error(`${field} legado no puede estar vacío`);
    return value;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error(`${field} legado no es una fecha válida`);
    return value.toISOString();
  }
  if (typeof value === "number") {
    const milliseconds = requiredNumber(value, `${field} timestamp`);
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) throw new Error(`${field} legado no es una fecha válida`);
    return date.toISOString();
  }
  const timestamp = asRecord(value);
  if (typeof timestamp.toDate === "function") {
    try {
      const date = timestamp.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    } catch {
      throw new Error(`${field} legado no es una fecha válida`);
    }
  }
  if (timestamp.seconds !== undefined) {
    const seconds = requiredNumber(timestamp.seconds, `${field}.seconds`);
    const nanoseconds = timestamp.nanoseconds === undefined ? 0 : requiredNumber(timestamp.nanoseconds, `${field}.nanoseconds`, { min: 0 });
    const date = new Date(seconds * 1000 + nanoseconds / 1_000_000);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  throw new Error(`${field} legado no es una fecha válida`);
}

export function mapLegacyStatus(value: unknown): OrderStatus {
  const normalized = String(value ?? "").trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const status = statusAliases[normalized];
  if (!status) throw new Error(`Estado legado no reconocido: ${String(value)}`);
  return status;
}

function mapLegacyItem(value: unknown, index: number): OrderItem {
  const item = asRecord(value);
  const quantity = requiredNumber(item.quantity, `items[${index}].quantity`, { integer: true, min: 1 });
  const price = item.price === undefined ? undefined : requiredNumber(item.price, `items[${index}].price`, { min: 0 });
  const unitPrice = item.unitPrice === undefined
    ? price
    : requiredNumber(item.unitPrice, `items[${index}].unitPrice`, { min: 0 });
  if (unitPrice === undefined) throw new Error(`items[${index}].price legado es obligatorio`);
  const derivedSubtotal = unitPrice * quantity;
  if (!Number.isFinite(derivedSubtotal)) throw new Error(`items[${index}].subtotal legado no es finito`);
  const subtotal = item.subtotal === undefined
    ? derivedSubtotal
    : requiredNumber(item.subtotal, `items[${index}].subtotal`, { min: 0 });
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
  const createdAt = toIso(data.createdAt, "createdAt");
  const updatedAt = toIso(data.updatedAt, "updatedAt", true) || createdAt;
  const clienteUid = typeof data.clienteUid === "string" ? data.clienteUid : "";
  if (!Array.isArray(data.items)) throw new Error("items legado debe ser una lista");
  const items = data.items.map(mapLegacyItem);
  const total = requiredNumber(data.total, "total", { min: 0 });
  const subtotal = data.subtotal === undefined ? total : requiredNumber(data.subtotal, "subtotal", { min: 0 });
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

function isAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
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
      const outcome = await getDb(options).runTransaction(async (transaction) => {
        if (isExisting(await transaction.get(target))) return "skipped" as const;
        transaction.create(target, mapLegacyOrder(document.id, asRecord(document.data()) as LegacyOrder));
        return "migrated" as const;
      });
      if (outcome === "skipped") {
        summary.skipped += 1;
        continue;
      }
      summary.migrated += 1;
    } catch (error) {
      if (isAlreadyExists(error)) {
        summary.skipped += 1;
        continue;
      }
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
    const field = findDifference(expected, targetData);
    if (field) mismatches.push({ id, field });
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

function findDifference(expected: unknown, actual: unknown, path = ""): string | undefined {
  if (Object.is(expected, actual)) return undefined;
  if (expected instanceof Date || actual instanceof Date) {
    return expected instanceof Date && actual instanceof Date && expected.getTime() === actual.getTime() ? undefined : path || "root";
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return path || "root";
    if (expected.length !== actual.length) return path ? `${path}.length` : "root.length";
    for (let index = 0; index < expected.length; index += 1) {
      const difference = findDifference(expected[index], actual[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return undefined;
  }
  if (asRecord(expected) !== expected || asRecord(actual) !== actual) return path || "root";
  const expectedRecord = expected as Record<string, unknown>;
  const actualRecord = actual as Record<string, unknown>;
  const keys = new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)]);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(expectedRecord, key) || !Object.prototype.hasOwnProperty.call(actualRecord, key)) {
      return path ? `${path}.${key}` : key;
    }
    const difference = findDifference(expectedRecord[key], actualRecord[key], path ? `${path}.${key}` : key);
    if (difference) return difference;
  }
  return undefined;
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
