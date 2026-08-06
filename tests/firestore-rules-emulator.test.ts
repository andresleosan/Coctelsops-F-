import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "demo-coctels-e2e";
const runId = process.env.FIRESTORE_RULES_RUN_ID ?? `${process.pid}-${randomUUID()}`;

let testEnvironment: RulesTestEnvironment;
let fixturePaths: Array<{ collection: string; id: string }> = [];
let fixtures: {
  customerId: string;
  otherCustomerId: string;
  staffId: string;
  adminId: string;
  orderId: string;
  otherOrderId: string;
  roleId: string;
  productId: string;
} | undefined;

function userProfile(displayName: string) {
  return {
    displayName,
    photoURL: null,
    telefono: null,
    addresses: [],
  };
}

async function seedFixtures() {
  const namespace = `${runId}-${randomUUID()}`;
  fixtures = {
    customerId: `${namespace}-customer`,
    otherCustomerId: `${namespace}-other-customer`,
    staffId: `${namespace}-staff`,
    adminId: `${namespace}-admin`,
    orderId: `${namespace}-order`,
    otherOrderId: `${namespace}-other-order`,
    roleId: `${namespace}-role`,
    productId: `${namespace}-product`,
  };

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    fixturePaths = [
      { collection: "users", id: fixtures!.customerId },
      { collection: "users", id: fixtures!.otherCustomerId },
      { collection: "users", id: fixtures!.staffId },
      { collection: "users", id: fixtures!.adminId },
      { collection: "pedidos", id: fixtures!.orderId },
      { collection: "pedidos", id: fixtures!.otherOrderId },
      { collection: "roles", id: fixtures!.roleId },
      { collection: "productos", id: fixtures!.productId },
    ];
    await Promise.all([
      setDoc(doc(db, "users", fixtures!.customerId), userProfile("Cliente de prueba")),
      setDoc(doc(db, "users", fixtures!.otherCustomerId), userProfile("Otro cliente")),
      setDoc(doc(db, "users", fixtures!.staffId), userProfile("Staff de prueba")),
      setDoc(doc(db, "users", fixtures!.adminId), userProfile("Admin de prueba")),
      setDoc(doc(db, "pedidos", fixtures!.orderId), { clienteUid: fixtures!.customerId, status: "pendiente" }),
      setDoc(doc(db, "pedidos", fixtures!.otherOrderId), { clienteUid: fixtures!.otherCustomerId, status: "pendiente" }),
      setDoc(doc(db, "roles", fixtures!.roleId), { name: "Staff" }),
      setDoc(doc(db, "productos", fixtures!.productId), { active: true, name: "Producto" }),
    ]);
  });
}

async function cleanupFixtures() {
  const paths = fixturePaths;
  fixturePaths = [];
  fixtures = undefined;
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(paths.map(({ collection, id }) => deleteDoc(doc(db, collection, id))));
  });
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(path.resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await seedFixtures();
});

afterEach(async () => {
  await cleanupFixtures();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("reglas Firestore en emulator", () => {
  it("permite al cliente leer y actualizar solo su perfil", async () => {
    const db = testEnvironment.authenticatedContext(fixtures!.customerId).firestore();

    await assertSucceeds(getDoc(doc(db, "users", fixtures!.customerId)));
    await assertSucceeds(updateDoc(doc(db, "users", fixtures!.customerId), { displayName: "Cliente actualizado" }));
    await assertFails(getDoc(doc(db, "users", fixtures!.otherCustomerId)));
    await assertFails(updateDoc(doc(db, "users", fixtures!.otherCustomerId), { displayName: "Cambio ajeno" }));
  });

  it("permite al cliente leer solo sus pedidos", async () => {
    const db = testEnvironment.authenticatedContext(fixtures!.customerId).firestore();

    await assertSucceeds(getDoc(doc(db, "pedidos", fixtures!.orderId)));
    await assertFails(getDoc(doc(db, "pedidos", fixtures!.otherOrderId)));
  });

  it("impide al cliente crear o modificar pedidos directamente", async () => {
    const db = testEnvironment.authenticatedContext(fixtures!.customerId).firestore();

    await assertFails(setDoc(doc(db, "pedidos", `${runId}-new-order`), { clienteUid: fixtures!.customerId }));
    await assertFails(updateDoc(doc(db, "pedidos", fixtures!.orderId), { status: "confirmado" }));
  });

  it("impide a staff escribir roles y datos administrativos", async () => {
    const db = testEnvironment.authenticatedContext(fixtures!.staffId, { staff: true }).firestore();

    await assertFails(setDoc(doc(db, "roles", `${runId}-new-role`), { name: "No permitido" }));
    await assertFails(updateDoc(doc(db, "productos", fixtures!.productId), { name: "Cambio no permitido" }));
    await assertFails(setDoc(doc(db, "auditoria", `${runId}-audit`), { action: "No permitido" }));
  });

  it("permite leer roles solo al admin con claim booleano estricto", async () => {
    const adminDb = testEnvironment.authenticatedContext(fixtures!.adminId, { admin: true }).firestore();
    const staffDb = testEnvironment.authenticatedContext(fixtures!.staffId, { staff: true }).firestore();
    const customerDb = testEnvironment.authenticatedContext(fixtures!.customerId).firestore();
    const nonBooleanAdminDb = testEnvironment.authenticatedContext(`${fixtures!.adminId}-string`, { admin: "true" }).firestore();

    await assertSucceeds(getDoc(doc(adminDb, "roles", fixtures!.roleId)));
    await assertFails(getDoc(doc(staffDb, "roles", fixtures!.roleId)));
    await assertFails(getDoc(doc(customerDb, "roles", fixtures!.roleId)));
    await assertFails(getDoc(doc(nonBooleanAdminDb, "roles", fixtures!.roleId)));
    await assertFails(setDoc(doc(adminDb, "roles", `${runId}-admin-role`), { name: "No permitido" }));
  });
});
