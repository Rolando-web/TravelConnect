// Dynamic, availability-first flight filter.
//
// Route, class and free-text we keep as substring matching (case-insensitive).
// The DATE is intentionally NOT an exact gate: an availability system should
// show what actually exists rather than a dead "no flights" page. If flights
// exist on the requested date we return exactly those; otherwise we return the
// route's departures sorted by proximity to the requested date and flag it.

const normalize = (s) => String(s ?? "").trim().toLowerCase();

// "2026-09-18" -> "Sep 18, 2026" (parse manually to avoid TZ day shifts).
function prettyDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return iso || "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Sort departures by |departureDate − targetDate| so the closest one comes first.
function byDateProximity(list, targetDate) {
  const target = Date.parse(String(targetDate || ""));
  if (Number.isNaN(target)) return list;
  return [...list].sort((a, b) => {
    const da = Date.parse(String(a.departureDate || ""));
    const db = Date.parse(String(b.departureDate || ""));
    if (Number.isNaN(da) && Number.isNaN(db)) return 0;
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return Math.abs(da - target) - Math.abs(db - target);
  });
}

/**
 * Filter an available flight catalog for the flight search page.
 *
 * @param {Array} flights raw flight rows ({departureCity, arrivalCity,
 *   departureDate, class, airline, flightNumber, ...})
 * @param {Object} criteria { from, to, date, flightClass, search }
 * @returns {{ list: Array, dateNotice: string }}
 *   - list: the flights to display (already proximity-sorted when the requested
 *     date has no exact match)
 *   - dateNotice: non-empty when the route is served but no exact departure
 *     exists on the requested date
 */
export function filterFlights(
  flights = [],
  { from = "", to = "", date = "", flightClass = "All", search = "" } = {}
) {
  const fromQ = normalize(from);
  const toQ = normalize(to);
  const dateQ = String(date || "").trim();
  const classQ = normalize(flightClass);
  const textQ = normalize(search);

  const routeMatch = flights.filter((f) => {
    if (fromQ && !normalize(f.departureCity).includes(fromQ)) return false;
    if (toQ && !normalize(f.arrivalCity).includes(toQ)) return false;
    if (classQ && classQ !== "all" && !normalize(f.class).includes(classQ)) return false;

    if (textQ) {
      const haystack = [f.airline, f.flightNumber, f.departureCity, f.arrivalCity]
        .map(normalize)
        .join(" ");
      if (!haystack.includes(textQ)) return false;
    }
    return true;
  });

  let list = routeMatch;
  let dateNotice = "";

  if (dateQ && routeMatch.length > 0) {
    const exact = routeMatch.filter(
      (f) => String(f.departureDate || "").trim() === dateQ
    );
    if (exact.length > 0) {
      list = exact;
    } else {
      list = byDateProximity(routeMatch, dateQ);
      dateNotice = `No departures exactly on ${prettyDate(dateQ)} — showing the nearest available departures for this route.`;
    }
  }

  return { list, dateNotice };
}