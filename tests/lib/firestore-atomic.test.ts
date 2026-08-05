import { beforeEach, describe, expect, it, vi } from "vitest";

const { roleGet, transactionGet, runTransaction, create } = vi.hoisted(() => ({
  roleGet: vi.fn(),
  transactionGet: vi.fn(),
  runTransaction: vi.fn(),
  create: vi.fn(),
}));
const roleRef = { get: roleGet };
const db = {
  collection: () => ({ doc: () => roleRef }),
  runTransaction,
};

vi.mock("@/lib/firebase-admin", () => ({ getAdminDb: () => db }));

import { createRole } from "@/lib/firestore/roles";

describe("firestore mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roleGet.mockResolvedValue({ exists: false });
    transactionGet.mockResolvedValue({ exists: false });
    runTransaction.mockImplementation(async (callback: (transaction: { get: typeof transactionGet; create: typeof create }) => Promise<unknown>) => callback({ get: transactionGet, create }));
  });

  it("escribe el rol y la auditoría en la misma transacción", async () => {
    await createRole({ name: "Operaciones", description: "", active: true, permissions: ["pedidos.read"] }, "admin-1");

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
