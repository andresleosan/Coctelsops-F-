import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { assertLoopbackEmulatorHosts } from "../src/firebase/emulators";
import { DEFAULT_STORE_CONFIGURATION } from "../src/types/operations";
import { PRODUCTS } from "../src/app/lib/products";

export type LocalE2ERole = "customer" | "staff" | "admin";

export type LocalE2EUser = {
  email: string;
  password: string;
  uid: string;
};

export type LocalE2EState = Record<LocalE2ERole, LocalE2EUser>;

const ROLE_SEEDS: Record<LocalE2ERole, {
  accountType: LocalE2ERole;
  name: string;
  permissions: string[];
}> = {
  customer: {
    accountType: "customer",
    name: "Cliente E2E",
    permissions: [],
  },
  staff: {
    accountType: "staff",
    name: "Staff E2E",
    permissions: [
      "pedidos.read",
      "pedidos.update",
      "productos.read",
      "productos.write",
      "categorias.read",
      "categorias.write",
      "clientes.read",
      "usuarios.read",
      "notificaciones.read",
      "roles.read",
    ],
  },
  admin: {
    accountType: "admin",
    name: "Administrador E2E",
    permissions: [],
  },
};

const CATEGORY_SEEDS = {
  granizado: { name: "Granizados", active: true, order: 1 },
  cocktail: { name: "Cocteles", active: true, order: 2 },
  special: { name: "Especiales", active: true, order: 3 },
} as const;

export function getLocalE2EStatePath(environment: Record<string, string | undefined> = process.env): string {
  const configuredPath = environment.E2E_STATE_FILE?.trim();
  return path.resolve(process.cwd(), configuredPath || ".tmp/e2e/local-state.json");
}

function createLocalE2EEmail(role: LocalE2ERole, timestamp: number): string {
  return `${role}-${timestamp}-${randomBytes(4).toString("hex")}@local.test`;
}

export function createLocalE2EPassword(): string {
  return randomBytes(24).toString("hex");
}

export function createLocalE2EState(timestamp = Date.now()): LocalE2EState {
  return {
    customer: {
      email: createLocalE2EEmail("customer", timestamp),
      password: createLocalE2EPassword(),
      uid: `pending-customer-${timestamp}`,
    },
    staff: {
      email: createLocalE2EEmail("staff", timestamp),
      password: createLocalE2EPassword(),
      uid: `pending-staff-${timestamp}`,
    },
    admin: {
      email: createLocalE2EEmail("admin", timestamp),
      password: createLocalE2EPassword(),
      uid: `pending-admin-${timestamp}`,
    },
  };
}

export function isLocalE2EState(value: unknown): value is LocalE2EState {
  if (!value || typeof value !== "object") return false;

  return (Object.keys(ROLE_SEEDS) as LocalE2ERole[]).every((role) => {
    const user = (value as Record<string, unknown>)[role];
    if (!user || typeof user !== "object") return false;
    const candidate = user as Record<string, unknown>;
    return typeof candidate.email === "string"
      && candidate.email.endsWith("@local.test")
      && typeof candidate.password === "string"
      && candidate.password.length >= 12
      && typeof candidate.uid === "string"
      && candidate.uid.length > 0;
  });
}

function assertLocalEmulatorEnvironment(): void {
  if (process.env.FIREBASE_EMULATORS !== "true") {
    throw new Error("El setup E2E solo puede ejecutarse con FIREBASE_EMULATORS=true.");
  }
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) {
    throw new Error("El setup E2E requiere FIREBASE_PROJECT_ID para el proyecto demo local.");
  }
  assertLoopbackEmulatorHosts(process.env);
}

function writeLocalE2EState(state: LocalE2EState): void {
  const stateFile = getLocalE2EStatePath();
  mkdirSync(path.dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export async function prepareLocalE2EState(): Promise<LocalE2EState> {
  assertLocalEmulatorEnvironment();

  const { getAdminAuth, getAdminDb } = await import("../src/lib/firebase-admin");
  const auth = getAdminAuth();
  const db = getAdminDb();
  const state = createLocalE2EState();
  const now = new Date().toISOString();

  try {
    for (const role of Object.keys(ROLE_SEEDS) as LocalE2ERole[]) {
      const user = await auth.createUser({
        email: state[role].email,
        password: state[role].password,
        emailVerified: true,
        displayName: ROLE_SEEDS[role].name,
      });
      state[role].uid = user.uid;
    }

    await auth.setCustomUserClaims(state.admin.uid, { admin: true });

    for (const role of Object.keys(ROLE_SEEDS) as LocalE2ERole[]) {
      const seed = ROLE_SEEDS[role];
      await db.collection("users").doc(state[role].uid).set({
        uid: state[role].uid,
        email: state[role].email,
        displayName: seed.name,
        photoURL: null,
        telefono: null,
        addresses: [],
        active: true,
        accountType: seed.accountType,
        roleIds: [role],
        permissions: [],
        createdAt: now,
        lastLoginAt: now,
      });
    }

    for (const [id, seed] of Object.entries(ROLE_SEEDS)) {
      await db.collection("roles").doc(id).set({
        name: seed.name,
        description: `Rol local para pruebas E2E (${id}).`,
        active: true,
        permissions: seed.permissions,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const product of PRODUCTS) {
      const { id, ...data } = product;
      await db.collection("productos").doc(id).set({ ...data, updatedAt: now });
    }

    for (const [id, data] of Object.entries(CATEGORY_SEEDS)) {
      await db.collection("categorias").doc(id).set({ ...data, updatedAt: now });
    }

    await db.collection("configuracion").doc("principal").set({
      ...DEFAULT_STORE_CONFIGURATION,
      updatedAt: now,
    });

    writeLocalE2EState(state);
    return state;
  } catch (error) {
    await Promise.allSettled(
      (Object.values(state) as LocalE2EUser[])
        .filter((user) => !user.uid.startsWith("pending-"))
        .map((user) => auth.deleteUser(user.uid)),
    );
    throw error;
  }
}

if (require.main === module) {
  prepareLocalE2EState()
    .then((state) => {
      console.log(`Estado E2E local preparado para ${Object.values(state).length} usuarios.`);
    })
    .catch((error: unknown) => {
      console.error("No fue posible preparar el estado E2E local", error instanceof Error ? error.message : "Error desconocido");
      process.exitCode = 1;
    });
}
