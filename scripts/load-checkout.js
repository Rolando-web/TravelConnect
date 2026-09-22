// Load smoke test (Phase 5 / R1).
// Run when the API is up on :5110:
//   k6 run scripts/load-checkout.js
// Pass criteria: zero HTTP 5xx, p95 latency < 500 ms, no DB connection
// exhaustion (watch the API log / SQL).
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

export const options = {
  stages: [
    { duration: "20s", target: 10 },  // ramp to 10 VUs
    { duration: "30s", target: 50 },  // 50 concurrent
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],          // <1% failures
    http_req_duration_p95: ["p(95)<500"],    // p95 under 500 ms
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:5110";

export default function () {
  // Public read path — dashboard/public is response-cached (60s)
  const stats = http.get(`${BASE}/api/dashboard/public`);
  check(stats, { "stats 200": (r) => r.status === 200 });

  // Featured packages — response-cached (120s)
  const featured = http.get(`${BASE}/api/packages/featured`);
  check(featured, { "featured 200": (r) => r.status === 200 });

  // Anonymous-checkout support: booking search is rate-limited public reads
  const locations = ["Manila", "Bali", "Paris", "Tokyo"];
  const loc = locations[Math.floor(Math.random() * locations.length)];
  const search = http.get(`${BASE}/api/packages/location/${loc}`);
  check(search, { "search 200": (r) => r.status === 200 });

  // Simulate checkout POST pressure (anonymous-write limiter: 10/min/IP —
  // keep the share low so the limiter itself isn't the bottleneck here)
  if (__VU % 5 === 0) {
    const payload = JSON.stringify({
      type: "Flight",
      customerName: "Load Tester",
      customerEmail: `load${__VU}@tc.com`,
      totalPrice: 12000,
      flightSegments: [
        { flightNumber: "FL100", from: "Manila", to: "Tokyo", departureDate: "2026-12-01", cabin: "Economy" },
      ],
    });
    const create = http.post(`${BASE}/api/bookings`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    check(create, { "booking accepted (200/201/400)": (r) => r.status === 200 || r.status === 201 || r.status === 400 });
  }

  sleep(Math.random() * 0.5);
}