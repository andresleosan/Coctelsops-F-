import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyRequest, getUserProfile, updateUserProfile } = vi.hoisted(() => ({
  verifyRequest: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock("@/lib/auth/verify-request", () => ({
  verifyRequest,
  toAuthorizationResponse: (error: Error & { status?: number }) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
}));
vi.mock("@/lib/firestore/users", () => ({ getUserProfile, updateUserProfile }));

import { GET, PATCH } from "@/app/api/account/profile/route";

const customer = {
  uid: "customer-1",
  profile: {
    uid: "customer-1",
    email: "cliente@example.com",
    displayName: "Cliente",
    photoURL: null,
    telefono: null,
    addresses: [],
    active: true,
    accountType: "customer",
    roleIds: ["customer"],
    permissions: [],
    createdAt: "2026-08-04T00:00:00.000Z",
    lastLoginAt: "2026-08-04T00:00:00.000Z",
  },
};

describe("/api/account/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyRequest.mockResolvedValue(customer);
    getUserProfile.mockResolvedValue(customer.profile);
    updateUserProfile.mockResolvedValue({
      ...customer.profile,
      telefono: "324 555 0000",
      addresses: [{ id: "casa", alias: "Casa", recipientName: "Cliente", phone: "324 555 0000", address: "Carrera 1 # 2-3", neighborhood: "Centro", city: "Medellin" }],
    });
  });

  it("returns the authenticated customer's own profile", async () => {
    const response = await GET(new Request("http://localhost/api/account/profile"));

    expect(response.status).toBe(200);
    expect(getUserProfile).toHaveBeenCalledWith("customer-1");
    const body = await response.json();
    expect(body).toEqual({ profile: {
      uid: customer.profile.uid,
      email: customer.profile.email,
      displayName: customer.profile.displayName,
      photoURL: customer.profile.photoURL,
      telefono: customer.profile.telefono,
      addresses: customer.profile.addresses,
    } });
    expect(body.profile).not.toHaveProperty("roleIds");
  });

  it("updates only the authenticated customer's phone and addresses", async () => {
    const input = {
      telefono: "324 555 0000",
      addresses: [{ id: "casa", alias: "Casa", recipientName: "Cliente", phone: "324 555 0000", address: "Carrera 1 # 2-3", neighborhood: "Centro", city: "Medellin" }],
    };

    const response = await PATCH(new Request("http://localhost/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }));

    expect(response.status).toBe(200);
    expect(updateUserProfile).toHaveBeenCalledWith("customer-1", input);
    await expect(response.json()).resolves.toMatchObject({ profile: { uid: "customer-1", telefono: input.telefono } });
  });

  it.each([
    ["uid", { uid: "another-user", telefono: "324 555 0000" }],
    ["email", { email: "attacker@example.com" }],
    ["roleIds", { roleIds: ["admin"] }],
    ["active", { active: false }],
  ])("rejects attempts to modify protected %s fields", async (_field, input) => {
    const response = await PATCH(new Request("http://localhost/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }));

    expect(response.status).toBe(422);
    expect(updateUserProfile).not.toHaveBeenCalled();
  });
});
