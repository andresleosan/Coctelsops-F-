import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { uid: "customer-1", displayName: "Cliente" }, loading: false, isAdmin: false }),
}));
vi.mock("@/lib/auth-client", () => ({ logout }));

import { AuthStatus } from "@/components/auth/AuthStatus";

describe("AuthStatus móvil", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite cerrar sesión desde el menú móvil autenticado", async () => {
    logout.mockResolvedValue(undefined);
    render(createElement(AuthStatus, { mobileMenu: true }));

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});
