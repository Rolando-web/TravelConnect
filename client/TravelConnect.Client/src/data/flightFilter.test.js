import { describe, it, expect } from "vitest";
import { filterFlights } from "./flightFilter";

const FLIGHTS = [
  { flightNumber: "PR 102", airline: "Philippine Airlines", departureCity: "Manila", arrivalCity: "Cebu", departureDate: "2026-09-15", departureTime: "07:00 AM", duration: "1h 15m", price: 4200, class: "Economy" },
  { flightNumber: "5J 501", airline: "Cebu Pacific", departureCity: "Manila", arrivalCity: "Boracay", departureDate: "2026-09-16", departureTime: "09:30 AM", duration: "1h 10m", price: 3800, class: "Economy" },
  { flightNumber: "NH 818", airline: "ANA", departureCity: "Manila", arrivalCity: "Tokyo", departureDate: "2026-09-18", departureTime: "08:15 PM", duration: "5h 45m", price: 28500, class: "Economy" },
  { flightNumber: "SQ 921", airline: "Singapore Airlines", departureCity: "Manila", arrivalCity: "Singapore", departureDate: "2026-09-20", departureTime: "04:00 PM", duration: "3h 45m", price: 24000, class: "Business" },
  { flightNumber: "Z2 522", airline: "Philippines AirAsia", departureCity: "Davao", arrivalCity: "Singapore", departureDate: "2026-09-21", departureTime: "01:05 PM", duration: "3h 15m", price: 19800, class: "Economy" },
  { flightNumber: "5J 979", airline: "Cebu Pacific", departureCity: "Davao", arrivalCity: "Cebu", departureDate: "2026-09-22", departureTime: "08:30 AM", duration: "1h 10m", price: 3600, class: "Economy" },
];

describe("filterFlights — route matching", () => {
  it("matches origin/destination by substring, case-insensitively", () => {
    const { list } = filterFlights(FLIGHTS, { from: "manila", to: "TOKYO" });
    expect(list).toHaveLength(1);
    expect(list[0].flightNumber).toBe("NH 818");
  });

  it("returns an empty list with no notice for a route with no flights", () => {
    const { list, dateNotice } = filterFlights(FLIGHTS, { from: "Manila", to: "Dubai", date: "2026-09-18" });
    expect(list).toHaveLength(0);
    expect(dateNotice).toBe("");
  });
});

describe("filterFlights — dynamic date behavior (the Phase 12 fix)", () => {
  it("returns exactly the requested date's flights when an exact match exists, without a notice", () => {
    const { list, dateNotice } = filterFlights(FLIGHTS, { from: "Manila", to: "Tokyo", date: "2026-09-18" });
    expect(list).toHaveLength(1);
    expect(list[0].flightNumber).toBe("NH 818");
    expect(dateNotice).toBe("");
  });

  it("falls back to the route's nearest departures when the date has no exact match, with a notice", () => {
    const { list, dateNotice } = filterFlights(FLIGHTS, { from: "Manila", to: "Tokyo", date: "2026-09-19" });
    expect(list).not.toHaveLength(0);
    expect(list.map((f) => f.flightNumber)).toContain("NH 818");
    expect(list[0].flightNumber).toBe("NH 818");
    expect(dateNotice).toContain("No departures exactly on");
    expect(dateNotice).toContain("nearest available");
  });

  it("orders fallback results by proximity to the requested date", () => {
    const { list } = filterFlights(FLIGHTS, { from: "Manila", to: "", date: "2026-09-14" });
    // Closest Manila departure to Sep 14 is Sep 15 (PR 102).
    expect(list[0].flightNumber).toBe("PR 102");
  });

  it("returns route flights without any date gating when no date is provided", () => {
    const { list, dateNotice } = filterFlights(FLIGHTS, { from: "Davao" });
    expect(list).toHaveLength(2);
    expect(dateNotice).toBe("");
  });
});

describe("filterFlights — class & free-text search", () => {
  it("respects a class filter", () => {
    const { list } = filterFlights(FLIGHTS, { flightClass: "Business" });
    expect(list).toHaveLength(1);
    expect(list[0].flightNumber).toBe("SQ 921");
  });

  it("treats the 'All' class as no class filter", () => {
    const { list } = filterFlights(FLIGHTS, { flightClass: "All" });
    expect(list).toHaveLength(FLIGHTS.length);
  });

  it("searches across airline, flight number and cities", () => {
    expect(filterFlights(FLIGHTS, { search: "airasia" }).list).toHaveLength(1);
    expect(filterFlights(FLIGHTS, { search: "NH 818" }).list).toHaveLength(1);
    expect(filterFlights(FLIGHTS, { search: "davao" }).list).toHaveLength(2);
  });
});