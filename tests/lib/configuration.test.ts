import { describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({ get }),
    }),
  }),
}));

import {
  getStoreConfiguration,
  StoreConfigurationUnavailableError,
  storeConfigurationSchema,
} from "@/lib/firestore/configuration";
import { DEFAULT_STORE_CONFIGURATION } from "@/types/operations";

describe("configuración del negocio", () => {
  it("rechaza horas imposibles aunque respeten el formato HH:mm", () => {
    expect(() => storeConfigurationSchema.parse({ ...DEFAULT_STORE_CONFIGURATION, businessHours: DEFAULT_STORE_CONFIGURATION.businessHours.map((hour, index) => index === 0 ? { ...hour, open: "29:90" } : hour) })).toThrow();
  });

  it("rechaza rangos iguales o invertidos porque no se soportan turnos nocturnos implícitos", () => {
    expect(() => storeConfigurationSchema.parse({ ...DEFAULT_STORE_CONFIGURATION, businessHours: DEFAULT_STORE_CONFIGURATION.businessHours.map((hour, index) => index === 0 ? { ...hour, open: "18:00", close: "18:00" } : hour) })).toThrow("cierre");
    expect(() => storeConfigurationSchema.parse({ ...DEFAULT_STORE_CONFIGURATION, businessHours: DEFAULT_STORE_CONFIGURATION.businessHours.map((hour, index) => index === 0 ? { ...hour, open: "18:00", close: "09:00" } : hour) })).toThrow("cierre");
  });

  it("rechaza una configuración ausente en lectura estricta y usa defaults solo cuando se permite", async () => {
    get.mockResolvedValue({ exists: false });

    await expect(getStoreConfiguration()).rejects.toBeInstanceOf(StoreConfigurationUnavailableError);
    await expect(getStoreConfiguration({ allowDefaults: true })).resolves.toEqual(DEFAULT_STORE_CONFIGURATION);
  });

  it("rechaza una configuración almacenada con un WhatsApp inválido en lectura estricta", async () => {
    get.mockResolvedValue({
      exists: true,
      data: () => ({ ...DEFAULT_STORE_CONFIGURATION, whatsappNumber: "123" }),
    });

    await expect(getStoreConfiguration()).rejects.toBeInstanceOf(StoreConfigurationUnavailableError);
  });
});
