import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import Footer from "@/components/layout/Footer";

const configuration = {
  whatsappNumber: "573245550000",
  businessHours: [],
  deliveryZones: ["Centro"],
  estimatedDeliveryMinutes: 45,
  messages: { orderReceived: "Recibido", orderStatus: "Estado", unavailable: "No disponible" },
};

describe("Footer WhatsApp configuration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    usePathname.mockReturnValue("/menu");
  });

  it("renderiza el WhatsApp configurado por la API", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ configuration }),
    } as Response);

    render(<Footer />);

    await waitFor(() => expect(screen.getByText("WhatsApp: 573245550000")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "WhatsApp: 573245550000" })).toHaveAttribute(
      "href",
      "https://wa.me/573245550000",
    );
  });

  it("omite el teléfono cuando la API responde con error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 503 } as Response);

    render(<Footer />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/configuration"));
    expect(screen.queryByText(/WhatsApp:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /WhatsApp:/ })).not.toBeInTheDocument();
  });

  it("omite el teléfono cuando la API responde 201 con configuración", async () => {
    let resolveResponse!: (response: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.spyOn(global, "fetch").mockReturnValue(responsePromise);

    render(<Footer />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/configuration"));

    await act(async () => {
      resolveResponse({
        ok: true,
        status: 201,
        json: async () => ({ configuration }),
      } as Response);
      await responsePromise;
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/WhatsApp:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /WhatsApp:/ })).not.toBeInTheDocument();
  });
});
