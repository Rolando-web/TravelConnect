import { describe, it, expect } from "vitest";
import { toDestination, groupDestinations } from "./destinationMeta";

describe("destinationMeta — domestic Philippine airports (Phase 12 fix)", () => {
  it("classifies Siargao as a Philippine / Asia destination (not International)", () => {
    const d = toDestination("Siargao");
    expect(d.country).toBe("Philippines");
    expect(d.region).toBe("Asia");
    expect(d.code).toBe("IAO");
  });

  it("classifies El Nido as a Philippine / Asia destination (not International)", () => {
    const d = toDestination("El Nido");
    expect(d.country).toBe("Philippines");
    expect(d.region).toBe("Asia");
    expect(d.code).toBe("ENI");
  });

  it("keeps Davao available as a Philippine / Asia origin", () => {
    const d = toDestination("Davao");
    expect(d.country).toBe("Philippines");
    expect(d.region).toBe("Asia");
    expect(d.code).toBe("DVO");
    expect(d.airport).toContain("Francisco Bangoy");
  });

  it("buckets Siargao and El Nido under asia, never under international", () => {
    const buckets = groupDestinations([
      toDestination("Siargao"),
      toDestination("El Nido"),
      toDestination("Tokyo"),
    ]);
    expect(buckets.asia.map((d) => d.city)).toEqual(
      expect.arrayContaining(["Siargao", "El Nido"])
    );
    expect(buckets.international.map((d) => d.city)).not.toContain("Siargao");
    expect(buckets.international.map((d) => d.city)).not.toContain("El Nido");
  });

  it("still treats unknown cities as International (safety fallback)", () => {
    const d = toDestination("Hinterwald");
    expect(d.region).toBe("International");
  });
});