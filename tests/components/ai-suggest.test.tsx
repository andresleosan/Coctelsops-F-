import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { aiFlavorSuggester } = vi.hoisted(() => ({
  aiFlavorSuggester: vi.fn(),
}));
const { toast } = vi.hoisted(() => ({
  toast: vi.fn(({ description }: { description?: string }) => {
    if (description) {
      const toastMessage = document.createElement("div");
      toastMessage.dataset.testToast = "true";
      toastMessage.textContent = description;
      document.body.append(toastMessage);
    }
  }),
}));

vi.mock("@/ai/flows/ai-flavor-suggester", () => ({ aiFlavorSuggester }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import AISuggestPage from "@/app/ai-suggest/page";

const validOutput = {
  flavorName: "Cítrico Rojo",
  description: "Una mezcla brillante y refrescante.",
  ingredients: ["Limón", "Fresa"],
};

describe("AI flavor suggester UI", () => {
  beforeEach(() => {
    aiFlavorSuggester.mockReset();
    toast.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.querySelectorAll('[data-test-toast="true"]').forEach((node) => node.remove());
    vi.restoreAllMocks();
  });

  it("limita las preferencias a 240 caracteres", () => {
    render(<AISuggestPage />);

    expect(screen.getByLabelText(/Ejemplo:/)).toHaveAttribute("maxLength", "240");
  });

  it("muestra un enlace al menú después de una sugerencia", async () => {
    aiFlavorSuggester.mockResolvedValue(validOutput);

    render(<AISuggestPage />);
    fireEvent.change(screen.getByLabelText(/Ejemplo:/), { target: { value: "algo cítrico" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar Receta Única" }));

    expect(await screen.findByRole("link", { name: "Ver menú y pedir" })).toHaveAttribute("href", "/menu");
  });

  it("muestra error genérico sin escribir la excepción en consola", async () => {
    const error = new Error("provider secret or prompt data");
    aiFlavorSuggester.mockRejectedValue(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<AISuggestPage />);
    fireEvent.change(screen.getByLabelText(/Ejemplo:/), { target: { value: "algo cítrico" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar Receta Única" }));

    expect(await screen.findByText("No pudimos generar una sugerencia en este momento.")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
