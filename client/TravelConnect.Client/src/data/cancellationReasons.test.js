import { describe, it, expect } from "vitest";
import { CANCELLATION_REASONS, money, tierPresentation } from "./cancellationReasons";

describe("cancellation reasons", () => {
  it("offers a stable set of coded reasons", () => {
    const values = CANCELLATION_REASONS.map((r) => r.value);
    expect(values).toContain("change-of-plans");
    expect(values).toContain("other");
    expect(new Set(values).size).toBe(values.length);
  });

  it("labels every policy tier the server can return", () => {
    for (const tier of ["grace", "early", "late", "non-refundable", "no-show", "anything-else"]) {
      const presentation = tierPresentation(tier);
      expect(presentation.label).toBeTruthy();
      expect(presentation.cls).toBeTruthy();
    }
  });

  it("falls back to manual review for an unknown tier", () => {
    expect(tierPresentation("mystery").label).toBe("Manual review");
  });
});

describe("money", () => {
  it("formats zero and missing amounts without crashing", () => {
    expect(money(0)).toBe("₱0.00");
    expect(money(undefined)).toBe("₱0.00");
  });

  it("keeps two decimals", () => {
    expect(money(6525)).toBe("₱6,525.00");
    expect(money(6525.5)).toBe("₱6,525.50");
  });
});
