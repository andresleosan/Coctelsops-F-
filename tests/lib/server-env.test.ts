import { describe, expect, it } from "vitest";
import { requireEnv } from "@/lib/server-env";

describe("requireEnv", () => {
  it("returns a configured value", () => {
    process.env.TEST_VALUE = "configured";
    expect(requireEnv("TEST_VALUE")).toBe("configured");
  });

  it("throws when a value is missing", () => {
    delete process.env.TEST_VALUE;
    expect(() => requireEnv("TEST_VALUE")).toThrow("Falta la variable TEST_VALUE");
  });
});
