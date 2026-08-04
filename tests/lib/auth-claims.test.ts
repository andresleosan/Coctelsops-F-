import { describe, expect, it } from "vitest";

import { esClaimAdmin } from "@/lib/auth-claims";

describe("esClaimAdmin", () => {
  it("acepta un claim admin booleano verdadero", () => {
    expect(esClaimAdmin({ admin: true })).toBe(true);
  });

  it("rechaza un claim admin booleano falso", () => {
    expect(esClaimAdmin({ admin: false })).toBe(false);
  });

  it("rechaza un claim admin ausente", () => {
    expect(esClaimAdmin({})).toBe(false);
  });

  it.each(["true", 1, null, undefined, [], {}])("rechaza valores no booleanos: %s", (value) => {
    expect(esClaimAdmin({ admin: value })).toBe(false);
  });
});
