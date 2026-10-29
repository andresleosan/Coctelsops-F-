import { describe, expect, it } from "vitest";

import { profileUpdateSchema } from "@/lib/validation/account";
import { productInputSchema } from "@/lib/validation/catalog";

function unreadableArray(length: number): unknown[] {
  return new Proxy(Array.from({ length }), {
    get(target, key, receiver) {
      if (typeof key === "string" && /^\d+$/.test(key)) {
        throw new Error("Oversized collection elements must not be visited");
      }
      return Reflect.get(target, key, receiver);
    },
  });
}

describe("existing request schema collection limits", () => {
  it("rejects oversized profile addresses before reading any address", () => {
    expect(profileUpdateSchema.safeParse({ addresses: unreadableArray(11) }).success).toBe(false);
  });

  it.each(["availableFlavors", "availableAddOns"])("rejects oversized catalog %s before reading any item", (key) => {
    expect(productInputSchema.safeParse({ [key]: unreadableArray(21) }).success).toBe(false);
  });
});
