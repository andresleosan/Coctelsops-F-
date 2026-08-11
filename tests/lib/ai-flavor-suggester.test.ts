import { beforeEach, describe, expect, it, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  defineFlow: vi.fn(),
  definePrompt: vi.fn(),
  flow: vi.fn(),
  flowHandler: undefined as undefined | ((input: unknown) => unknown),
  prompt: vi.fn(),
}));

vi.mock("@/ai/genkit", () => ({
  ai: {
    defineFlow: aiMocks.defineFlow,
    definePrompt: aiMocks.definePrompt,
  },
}));

aiMocks.defineFlow.mockImplementation((_config, handler) => {
  aiMocks.flowHandler = handler;
  return aiMocks.flow;
});

const validOutput = {
  flavorName: "Citrus Brisa",
  description: "Una mezcla fresca y vibrante.",
  ingredients: ["limon", "naranja"],
};

beforeEach(() => {
  aiMocks.definePrompt.mockReturnValue(aiMocks.prompt);
  aiMocks.flow.mockReset();
  aiMocks.prompt.mockReset();
  aiMocks.prompt.mockResolvedValue({ output: validOutput });
  aiMocks.flow.mockImplementation((input) => aiMocks.flowHandler?.(input));
});

describe("aiFlavorSuggester", () => {
  it("rechaza preferencias vacias o mayores a 240 sin invocar el flow", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");

    await expect(aiFlavorSuggester({ preferences: "  " })).rejects.toThrow();
    await expect(aiFlavorSuggester({ preferences: "a".repeat(241) })).rejects.toThrow();
    expect(aiMocks.flow).not.toHaveBeenCalled();
  });

  it.each(["a", "ab"])("rechaza una preferencia no vacia de %s caracteres sin invocar el flow", async (preferences) => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");

    await expect(aiFlavorSuggester({ preferences })).rejects.toThrow();
    expect(aiMocks.flow).not.toHaveBeenCalled();
  });

  it("recorta preferencias antes de invocar el flow", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");

    await aiFlavorSuggester({ preferences: "  frutas citricas  " });

    expect(aiMocks.flow).toHaveBeenCalledWith({ preferences: "frutas citricas" });
  });

  it("convierte una salida invalida en un error generico estable", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    aiMocks.prompt.mockResolvedValue({ output: { flavorName: "x" } });

    const rejection = aiFlavorSuggester({ preferences: "algo citrico" });

    await expect(rejection).rejects.toMatchObject({
      name: "AIFlavorSuggesterError",
      message: "No pudimos generar una sugerencia en este momento.",
    });
  });

  it("rechaza una salida con mas de ocho ingredientes con un error generico", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    aiMocks.prompt.mockResolvedValue({
      output: {
        ...validOutput,
        ingredients: Array.from({ length: 9 }, (_, index) => `ingrediente-${index}`),
      },
    });

    await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toThrow(
      "No pudimos generar una sugerencia en este momento.",
    );
  });

  it("rechaza un nombre de sabor mayor a 80 caracteres", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    aiMocks.flow.mockResolvedValue({ ...validOutput, flavorName: "a".repeat(81) });

    await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toThrow(
      "No pudimos generar una sugerencia en este momento.",
    );
  });

  it("rechaza una descripcion mayor a 300 caracteres", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    aiMocks.flow.mockResolvedValue({ ...validOutput, description: "a".repeat(301) });

    await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toThrow(
      "No pudimos generar una sugerencia en este momento.",
    );
  });

  it("rechaza un ingrediente mayor a 60 caracteres", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    aiMocks.flow.mockResolvedValue({
      ...validOutput,
      ingredients: ["a".repeat(61)],
    });

    await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toThrow(
      "No pudimos generar una sugerencia en este momento.",
    );
  });

  it("convierte los fallos del proveedor en un error generico sin conservar el detalle", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    aiMocks.prompt.mockRejectedValue(new Error("provider failure"));

    const error = await aiFlavorSuggester({ preferences: "algo citrico" }).catch((caught) => caught);

    expect(error).toMatchObject({
      name: "AIFlavorSuggesterError",
      message: "No pudimos generar una sugerencia en este momento.",
    });
    expect(error).not.toMatchObject({ message: "provider failure" });
  });

  it("aplica un timeout de diez segundos y limpia los timers de prueba", async () => {
    vi.useFakeTimers();
    try {
      const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
      aiMocks.flow.mockReturnValue(new Promise(() => undefined));

      const rejection = expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toMatchObject({
        name: "AIFlavorSuggesterError",
        message: "No pudimos generar una sugerencia en este momento.",
      });
      await vi.advanceTimersByTimeAsync(10_001);

      await rejection;
    } finally {
      vi.clearAllTimers();
      vi.clearAllMocks();
      vi.useRealTimers();
    }
  });
});
