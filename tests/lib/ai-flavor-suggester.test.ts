import { beforeEach, describe, expect, it, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  defineFlow: vi.fn(),
  definePrompt: vi.fn(),
  flow: vi.fn(),
  flowHandler: undefined as undefined | ((input: unknown) => unknown),
  prompt: vi.fn(),
}));

const rateLimitMocks = vi.hoisted(() => ({
  getAdminDb: vi.fn(),
  getRateLimitIdentity: vi.fn(),
  hashRateLimitIdentity: vi.fn(),
  headers: vi.fn(),
  reserveAIRateLimit: vi.fn(),
}));

vi.mock("@/ai/genkit", () => ({
  ai: {
    defineFlow: aiMocks.defineFlow,
    definePrompt: aiMocks.definePrompt,
  },
}));

vi.mock("next/headers", () => ({
  headers: rateLimitMocks.headers,
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: rateLimitMocks.getAdminDb,
}));

vi.mock("@/lib/ai/ai-rate-limit", () => ({
  getRateLimitIdentity: rateLimitMocks.getRateLimitIdentity,
  hashRateLimitIdentity: rateLimitMocks.hashRateLimitIdentity,
  reserveAIRateLimit: rateLimitMocks.reserveAIRateLimit,
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
  process.env.AI_RATE_LIMIT_SECRET = "test-rate-limit-secret";
  aiMocks.definePrompt.mockReturnValue(aiMocks.prompt);
  aiMocks.flow.mockReset();
  aiMocks.prompt.mockReset();
  aiMocks.prompt.mockResolvedValue({ output: validOutput });
  aiMocks.flow.mockImplementation((input) => aiMocks.flowHandler?.(input));
  rateLimitMocks.getAdminDb.mockReset();
  rateLimitMocks.getRateLimitIdentity.mockReset();
  rateLimitMocks.hashRateLimitIdentity.mockReset();
  rateLimitMocks.headers.mockReset();
  rateLimitMocks.reserveAIRateLimit.mockReset();
  rateLimitMocks.getAdminDb.mockReturnValue({});
  rateLimitMocks.getRateLimitIdentity.mockReturnValue("203.0.113.8");
  rateLimitMocks.hashRateLimitIdentity.mockReturnValue("digest");
  rateLimitMocks.headers.mockResolvedValue(new Headers());
  rateLimitMocks.reserveAIRateLimit.mockResolvedValue(true);
});

describe("aiFlavorSuggester", () => {
  it("rechaza preferencias vacias o mayores a 240 sin invocar el flow", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");

    await expect(aiFlavorSuggester({ preferences: "  " })).rejects.toThrow();
    await expect(aiFlavorSuggester({ preferences: "a".repeat(241) })).rejects.toThrow();
    expect(aiMocks.flow).not.toHaveBeenCalled();
    expect(rateLimitMocks.reserveAIRateLimit).not.toHaveBeenCalled();
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
    expect(rateLimitMocks.getRateLimitIdentity).toHaveBeenCalledWith(expect.any(Headers));
    expect(rateLimitMocks.hashRateLimitIdentity).toHaveBeenCalledWith("203.0.113.8", "test-rate-limit-secret");
    expect(rateLimitMocks.reserveAIRateLimit).toHaveBeenCalledWith({ db: {}, digest: "digest" });
  });

  it("no invoca el prompt cuando la reserva de cuota es rechazada", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    rateLimitMocks.reserveAIRateLimit.mockResolvedValue(false);

    await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toMatchObject({
      name: "AIFlavorSuggesterError",
      message: "No pudimos generar una sugerencia en este momento.",
    });
    expect(aiMocks.prompt).not.toHaveBeenCalled();
    expect(aiMocks.flow).not.toHaveBeenCalled();
  });

  it("convierte la falta del secreto en un error generico sin invocar Gemini", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    const configuredSecret = process.env.AI_RATE_LIMIT_SECRET;
    delete process.env.AI_RATE_LIMIT_SECRET;

    try {
      await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toMatchObject({
        name: "AIFlavorSuggesterError",
        message: "No pudimos generar una sugerencia en este momento.",
      });
      expect(aiMocks.flow).not.toHaveBeenCalled();
    } finally {
      process.env.AI_RATE_LIMIT_SECRET = configuredSecret;
    }
  });

  it("convierte un fallo del limitador en un error generico sin invocar Gemini", async () => {
    const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
    rateLimitMocks.reserveAIRateLimit.mockRejectedValue(new Error("rate limiter failure"));

    await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toMatchObject({
      name: "AIFlavorSuggesterError",
      message: "No pudimos generar una sugerencia en este momento.",
    });
    expect(aiMocks.flow).not.toHaveBeenCalled();
  });

  it("aplica el timeout mientras espera la reserva de cuota", async () => {
    vi.useFakeTimers();
    try {
      const { aiFlavorSuggester } = await import("@/ai/flows/ai-flavor-suggester");
      let resolveReservation: ((allowed: boolean) => void) | undefined;
      const reservationStarted = new Promise<void>((resolve) => {
        rateLimitMocks.reserveAIRateLimit.mockImplementation(
          () => new Promise<boolean>((reservationResolve) => {
            resolveReservation = reservationResolve;
            resolve();
          }),
        );
      });

      const action = aiFlavorSuggester({ preferences: "algo citrico" });
      await reservationStarted;
      vi.setSystemTime(Date.now() + 10_001);
      resolveReservation?.(true);

      await expect(action).rejects.toMatchObject({
        name: "AIFlavorSuggesterError",
        message: "No pudimos generar una sugerencia en este momento.",
      });
      expect(aiMocks.flow).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.clearAllMocks();
      vi.useRealTimers();
    }
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
