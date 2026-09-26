// Booking/status date rules shared by the client status card and its tests.
// Mirrors the backend booking lifecycle: a journey is "completed" once its
// latest travel date (last flight departure, else itinerary end/start date)
// is behind the current date. Cancelled / refunded wins over everything.

export function deriveFlightStatus(booking) {
  const status = booking?.status;
  if (status === "cancelled" || status === "refunded") return "cancelled";
  if (status === "completed") return "completed";

  const flights = Array.isArray(booking?.bookingFlights) ? booking.bookingFlights : [];
  const dates = flights
    .map((f) => f && f.departureDate)
    .filter((d) => typeof d === "string" && d.length > 0)
    .map((d) => d.slice(0, 10));
  const travel = dates.length > 0
    ? dates.sort().at(-1)
    : (booking?.endDate || booking?.startDate || "").slice(0, 10);

  if (!travel) return "scheduled";

  const today = new Date().toISOString().slice(0, 10);
  if (travel < today) return "completed";
  if (travel === today) return "today";
  return "scheduled";
}