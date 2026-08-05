import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDocument = { data: Record<string, unknown> };

const { documents, verifyIdToken } = vi.hoisted(() => ({
  documents: new Map<string, Map<string, StoredDocument>>(),
  verifyIdToken: vi.fn(),
}));

function snapshot(id: string, document?: StoredDocument) {
  return { id, exists: Boolean(document), data: () => document?.data };
}

function ref(collectionName: string, id: string) {
  return {
    id,
    get: async () => snapshot(id, documents.get(collectionName)?.get(id)),
    set: async (data: Record<string, unknown>) => {
      const stored = documents.get(collectionName) ?? new Map<string, StoredDocument>();
      stored.set(id, { data });
      documents.set(collectionName, stored);
    },
    update: async (data: Record<string, unknown>) => {
      const stored = documents.get(collectionName) ?? new Map<string, StoredDocument>();
      stored.set(id, { data: { ...(stored.get(id)?.data ?? {}), ...data } });
      documents.set(collectionName, stored);
    },
  };
}

function collection(collectionName: string) {
  return {
    doc: (id: string) => ref(collectionName, id),
    where: (field: string, _operator: string, value: unknown) => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ docs: [...(documents.get(collectionName)?.entries() ?? [])]
            .filter(([, document]) => document.data[field] === value)
            .map(([id, document]) => snapshot(id, document)) }),
        }),
      }),
    }),
  };
}

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
  getAdminDb: () => ({ collection }),
}));

import { POST as sync } from "@/app/api/auth/sync/route";
import { GET as profile } from "@/app/api/account/profile/route";
import { GET as orders } from "@/app/api/pedidos/route";

describe("auth sync integration boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documents.clear();
    verifyIdToken.mockResolvedValue({
      uid: "customer-new",
      email: "nuevo@example.com",
      name: "Cliente Nuevo",
      email_verified: true,
      admin: false,
    });
    documents.set("pedidos", new Map([["pedido-1", { data: {
      clienteUid: "customer-new",
      customerName: "Cliente Nuevo",
      phone: "300 000 0000",
      address: "Carrera 1 # 2-3",
      items: [],
      total: 10000,
      status: "pendiente",
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:00.000Z",
      audit: { createdByUid: "customer-new", createdAt: "2026-08-04T00:00:00.000Z" },
    } }]]));
  });

  it("sincroniza al cliente nuevo y después permite perfil e historial protegidos", async () => {
    const request = () => new Request("http://localhost/api", { headers: { authorization: "Bearer fresh-token" } });

    const syncResponse = await sync(request());
    expect(syncResponse.status).toBe(200);

    const profileResponse = await profile(request());
    const ordersResponse = await orders(new Request("http://localhost/api/pedidos?mine=true", {
      headers: { authorization: "Bearer fresh-token" },
    }));

    expect(profileResponse.status).toBe(200);
    expect(ordersResponse.status).toBe(200);
    await expect(profileResponse.json()).resolves.toMatchObject({ profile: { uid: "customer-new" } });
    await expect(ordersResponse.json()).resolves.toMatchObject({ orders: [{ id: "pedido-1" }] });
  });
});
