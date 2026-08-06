import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rules = readFileSync("firestore.rules", "utf8");

// Este archivo conserva el contrato estatico; solo la suite con emulator puede
// demostrar que una lectura o escritura resulta permitida o denegada.
describe("Firestore ownership contract", () => {
  it("keeps managed writes server-only instead of trusting browser admin claims", () => {
    expect(rules).toContain("match /roles/{roleId} {");
    expect(rules).toContain("match /pedidos/{orderId} {");
    expect(rules).toContain("match /productos/{productId} {");
    expect(rules).toContain("match /categorias/{categoryId} {");
    expect(rules).toContain("match /auditoria/{auditId} {");
    expect(rules).toContain("allow read, write: if false;");
    expect(rules).toContain("allow create, update, delete: if false;");
    expect(rules).toContain("allow write: if false;");
    expect(rules).not.toContain("allow write: if isAdmin");
    expect(rules).not.toContain("allow read, write: if isAdmin");
  });

  it("preserves customer ownership reads and public active catalog reads", () => {
    expect(rules).toContain("allow read: if ownsUser(uid);");
    expect(rules).toContain("allow read: if ownsOrder();");
    expect(rules).toContain("allow read: if resource.data.active == true;");
  });
});
