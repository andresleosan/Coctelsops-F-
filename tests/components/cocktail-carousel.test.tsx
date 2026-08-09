/* eslint-disable @next/next/no-img-element */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img alt={String(props.alt ?? "")} {...props} /> }));

import CocktailCarousel from "@/components/products/CocktailCarousel";

const product = {
  id: "fresa-salvaje",
  name: "Fresa Salvaje",
  description: "Granizado de fresa natural.",
  price: 8500,
  image: "https://storage.googleapis.com/example/fresa.jpg",
  category: "granizado" as const,
  availableFlavors: ["Fresa"],
  availableAddOns: [],
  stock: 10,
  active: true,
  featured: true,
};

describe("CocktailCarousel", () => {
  afterEach(cleanup);

  it("usa la imagen del producto destacado, nunca una ruta local hardcodeada", () => {
    render(<CocktailCarousel products={[product]} />);

    expect(screen.getByRole("img", { name: product.name })).toHaveAttribute("src", product.image);
    expect(screen.queryByRole("img", { name: "Mango Biche Special" })).not.toBeInTheDocument();
  });

  it("filtra productos no activos o no destacados en orden estable", () => {
    render(<CocktailCarousel products={[{ ...product, id: "hidden", name: "Oculto", active: false }, product]} />);

    expect(screen.getByRole("img", { name: product.name })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Oculto" })).not.toBeInTheDocument();
  });

  it("muestra un fallback sin imagen rota cuando no hay destacados", () => {
    render(<CocktailCarousel products={[]} />);

    expect(screen.getByText("Catálogo en preparación")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
