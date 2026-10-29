import { describe, expect, it } from "vitest";

import { selectLocalEmulatorProcessEnvironment } from "../../scripts/local-emulator-env";

describe("entorno de procesos de emulador", () => {
  it("conserva solo variables de ejecución y descarta credenciales y overrides externos", () => {
    const environment = selectLocalEmulatorProcessEnvironment({
      Path: "C:\\bin",
      JAVA_HOME: "C:\\jdk",
      TEMP: "C:\\tmp",
      FIREBASE_PRIVATE_KEY: "secret",
      GOOGLE_APPLICATION_CREDENTIALS: "C:\\private.json",
      E2E_ADMIN_PASSWORD: "secret",
      E2E_BASE_URL: "https://remote.example.test",
    });

    expect(environment).toEqual({ Path: "C:\\bin", JAVA_HOME: "C:\\jdk", TEMP: "C:\\tmp" });
  });
});
