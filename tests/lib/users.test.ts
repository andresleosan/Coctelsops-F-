import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, set } = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
const userRef = { get, set };

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: () => ({ collection: () => ({ doc: () => userRef }) }),
}));

import { syncUser } from "@/lib/firestore/users";

describe("syncUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    set.mockResolvedValue(undefined);
  });

  it("rechaza y no escribe sobre un perfil inactivo", async () => {
    get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ uid: "user-1", email: "cliente@example.com", active: false, accountType: "customer", roleIds: ["customer"] }),
    });

    await expect(syncUser("user-1", { email: "nuevo@example.com", displayName: "Nuevo", photoURL: null })).rejects.toMatchObject({ status: 401 });
    expect(set).not.toHaveBeenCalled();
  });

  it("crea un perfil nuevo como customer activo", async () => {
    get.mockResolvedValueOnce({ exists: false, data: () => undefined });

    await syncUser("user-1", { email: "cliente@example.com", displayName: "Cliente", photoURL: null });

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ active: true, accountType: "customer", roleIds: ["customer"] }), { merge: true });
  });
});
