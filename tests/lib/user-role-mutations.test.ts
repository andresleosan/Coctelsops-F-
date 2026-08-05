import { beforeEach, describe, expect, it, vi } from "vitest";

const { userGet, roleGet, transactionGet, transactionUpdate, transactionCreate, runTransaction } = vi.hoisted(() => ({
  userGet: vi.fn(),
  roleGet: vi.fn(),
  transactionGet: vi.fn(),
  transactionUpdate: vi.fn(),
  transactionCreate: vi.fn(),
  runTransaction: vi.fn(),
}));

const userReference = { get: userGet };
const roleReference = { get: roleGet };
const db = {
  collection: (name: string) => ({ doc: () => name === "users" ? userReference : roleReference }),
  runTransaction,
};

vi.mock("@/lib/firebase-admin", () => ({ getAdminDb: () => db }));

import { updateUser } from "@/lib/firestore/users";

describe("asignación de roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roleGet.mockResolvedValue({ exists: true });
    transactionGet.mockResolvedValue({ exists: true, data: () => ({ uid: "other-user", active: true }) });
    runTransaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
      get: transactionGet,
      update: transactionUpdate,
      create: transactionCreate,
    }));
  });

  it("rechaza que un miembro del personal se asigne roles a sí mismo", async () => {
    await expect(updateUser("staff-1", { roleIds: ["admin"] }, "staff-1")).rejects.toMatchObject({ status: 409 });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it("conserva la asignación legítima de roles a otro usuario", async () => {
    await updateUser("customer-1", { roleIds: ["staff"] }, "staff-1");

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transactionUpdate).toHaveBeenCalledWith(expect.anything(), { roleIds: ["staff"] });
  });
});
