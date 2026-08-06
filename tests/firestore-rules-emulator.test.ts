import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "demo-coctels-e2e";
const customerId = "customer-rules-test";
const otherCustomerId = "other-customer-rules-test";
const staffId = "staff-rules-test";
const adminId = "admin-rules-test";
const orderId = "order-rules-test";
const otherOrderId = "other-order-rules-test";

let testEnvironment: RulesTestEnvironment;

function userProfile(displayName: string) {
  return {
    displayName,
    photoURL: null,
    telefono: null,
    addresses: [],
  };
}

async function seedFixtures() {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", customerId), userProfile("Cliente de prueba")),
      setDoc(doc(db, "users", otherCustomerId), userProfile("Otro cliente")),
      setDoc(doc(db, "users", staffId), userProfile("Staff de prueba")),
      setDoc(doc(db, "users", adminId), userProfile("Admin de prueba")),
      setDoc(doc(db, "pedidos", orderId), { clienteUid: customerId, status: "pendiente" }),
      setDoc(doc(db, "pedidos", otherOrderId), { clienteUid: otherCustomerId, status: "pendiente" }),
      setDoc(doc(db, "roles", "role-rules-test"), { name: "Staff" }),
      setDoc(doc(db, "productos", "product-rules-test"), { active: true, name: "Producto" }),
    ]);
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
  await testEnvironment.clearFirestore();
  await seedFixtures();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("reglas Firestore en emulator", () => {
  it("permite al cliente leer y actualizar solo su perfil", async () => {
    const db = testEnvironment.authenticatedContext(customerId).firestore();

    await assertSucceeds(getDoc(doc(db, "users", customerId)));
    await assertSucceeds(updateDoc(doc(db, "users", customerId), { displayName: "Cliente actualizado" }));
    await assertFails(getDoc(doc(db, "users", otherCustomerId)));
    await assertFails(updateDoc(doc(db, "users", otherCustomerId), { displayName: "Cambio ajeno" }));
  });

  it("permite al cliente leer solo sus pedidos", async () => {
    const db = testEnvironment.authenticatedContext(customerId).firestore();

    await assertSucceeds(getDoc(doc(db, "pedidos", orderId)));
    await assertFails(getDoc(doc(db, "pedidos", otherOrderId)));
  });

  it("impide al cliente crear o modificar pedidos directamente", async () => {
    const db = testEnvironment.authenticatedContext(customerId).firestore();

    await assertFails(setDoc(doc(db, "pedidos", "new-order-rules-test"), { clienteUid: customerId }));
    await assertFails(updateDoc(doc(db, "pedidos", orderId), { status: "confirmado" }));
  });

  it("impide a staff escribir roles y datos administrativos", async () => {
    const db = testEnvironment.authenticatedContext(staffId, { staff: true }).firestore();

    await assertFails(setDoc(doc(db, "roles", "new-role-rules-test"), { name: "No permitido" }));
    await assertFails(updateDoc(doc(db, "productos", "product-rules-test"), { name: "Cambio no permitido" }));
    await assertFails(setDoc(doc(db, "auditoria", "audit-rules-test"), { action: "No permitido" }));
  });

  it("permite al admin con claim booleano estricto solo donde existe una regla", async () => {
    const db = testEnvironment.authenticatedContext(adminId, { admin: true }).firestore();

    await assertSucceeds(getDoc(doc(db, "users", adminId)));
    await assertFails(setDoc(doc(db, "roles", "admin-role-rules-test"), { name: "No permitido" }));
    await assertFails(updateDoc(doc(db, "pedidos", orderId), { status: "entregado" }));
  });
});
