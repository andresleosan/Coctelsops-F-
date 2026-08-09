/* eslint-disable @next/next/no-img-element */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }) }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img alt={String(props.alt ?? "")} {...props} /> }));

import { ProductForm } from "@/components/admin/ProductForm";

const product = {
  id: "fresa-salvaje",
  name: "Fresa Salvaje",
  description: "Granizado de fresa natural.",
  price: 8500,
  image: "https://firebasestorage.googleapis.com/v0/b/example/o/fresa.jpg?alt=media&token=token",
  category: "granizado" as const,
  availableFlavors: ["Fresa"],
  availableAddOns: [],
  stock: 10,
  active: true,
  featured: true,
};

describe("ProductForm preview de imagen", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("muestra la imagen actual y actualiza el preview al seleccionar un archivo", () => {
    render(<ProductForm product={product} />);

    const preview = screen.getByRole("img", { name: "Vista previa de Fresa Salvaje" });
    expect(preview).toHaveAttribute("src", product.image);

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "nueva.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Reemplazar imagen"), { target: { files: [file] } });

    expect(screen.getByRole("img", { name: "Vista previa de Fresa Salvaje" })).toHaveAttribute("src", "blob:preview");
  });
});
