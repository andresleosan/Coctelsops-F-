import { describe, expect, it } from "vitest";

import { storeConfigurationSchema } from "@/lib/firestore/configuration";
import { DEFAULT_STORE_CONFIGURATION } from "@/types/operations";

describe("configuración del negocio", () => {
  it("rechaza horas imposibles aunque respeten el formato HH:mm", () => {
    expect(() => storeConfigurationSchema.parse({ ...DEFAULT_STORE_CONFIGURATION, businessHours: DEFAULT_STORE_CONFIGURATION.businessHours.map((hour, index) => index === 0 ? { ...hour, open: "29:90" } : hour) })).toThrow();
  });

  it("rechaza rangos iguales o invertidos porque no se soportan turnos nocturnos implícitos", () => {
    expect(() => storeConfigurationSchema.parse({ ...DEFAULT_STORE_CONFIGURATION, businessHours: DEFAULT_STORE_CONFIGURATION.businessHours.map((hour, index) => index === 0 ? { ...hour, open: "18:00", close: "18:00" } : hour) })).toThrow("cierre");
    expect(() => storeConfigurationSchema.parse({ ...DEFAULT_STORE_CONFIGURATION, businessHours: DEFAULT_STORE_CONFIGURATION.businessHours.map((hour, index) => index === 0 ? { ...hour, open: "18:00", close: "09:00" } : hour) })).toThrow("cierre");
  });
});
