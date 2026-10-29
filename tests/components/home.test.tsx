/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFeaturedProducts } = vi.hoisted(() => ({
  getFeaturedProducts: vi.fn(),
}));
const { getStoreConfiguration } = vi.hoisted(() => ({
  getStoreConfiguration: vi.fn(),
}));

vi.mock("@/lib/catalog/home", () => ({ getFeaturedProducts }));
vi.mock("@/lib/firestore/configuration", () => ({ getStoreConfiguration }));
vi.mock("next/image", () => ({ default: (props: { alt?: string; src?: string }) => <img alt={props.alt ?? ""} src={props.src} /> }));
vi.mock("next/link", () => ({ default: (props: { children: ReactNode; href: string }) => <a href={props.href}>{props.children}</a> }));
vi.mock("@/components/products/ProductCard", () => ({ default: () => <div /> }));
vi.mock("@/components/products/CocktailCarousel", () => ({ default: () => <div /> }));

import Home from "@/app/page";

const configuration = {
  whatsappNumber: "573245550000",
  businessHours: [],
  deliveryZones: ["Centro"],
  estimatedDeliveryMinutes: 45,
  messages: { orderReceived: "Recibido", orderStatus: "Estado", unavailable: "No disponible" },
};

describe("Home WhatsApp configuration", () => {
  beforeEach(() => {
    getFeaturedProducts.mockResolvedValue([]);
    getStoreConfiguration.mockResolvedValue(configuration);
  });

  it("renderiza el enlace y teléfono WhatsApp configurados", async () => {
    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("https://wa.me/573245550000");
    expect(html).toContain("573245550000");
    expect(html).not.toContain("573245545530");
  });

  it("omite enlaces y teléfono WhatsApp si falla la configuración", async () => {
    getStoreConfiguration.mockRejectedValue(new Error("configuración no disponible"));

    const html = renderToStaticMarkup(await Home());

    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("573245545530");
    expect(html).not.toContain("Pide por WhatsApp");
  });
});
