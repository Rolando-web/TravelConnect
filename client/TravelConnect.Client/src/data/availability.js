import { toDestination } from "./destinationMeta";

// Compute a combined "what's actually available" view from live service data.
// Returns:
//   - flights, hotels            : the raw lists (useful for counts)
//   - flightRoutes               : [{ from, to, city, price, flight }] deduped routes
//   - reachableCities           : destinations that have at least one departing flight
//   - hotelCities               : destinations that have at least one hotel
//   - availableDestinations     : unified list of destinations with services
//   - availableForTrip          : cities that you can both fly to AND stay in (bundle-ready)
//
// `hotelCityOf` maps a hotel's location string ("Boracay") into a flight destination
// city ("Boracay"); falls back to the location string itself.
export function buildAvailability(flights = [], hotels = []) {
  const flightCitySet = new Set();

  // Build deduped routes keyed by "FROM>TO"
  const routeMap = new Map();
  (flights.length ? flights : []).forEach((f) => {
    const fromCity = f.departureCity?.trim();
    const toCity = f.arrivalCity?.trim();
    if (!fromCity || !toCity) return;
    const from = toDestination(fromCity);
    const to = toDestination(toCity);
    const key = `${from.code || fromCity}>${to.code || toCity}`;
    if (!routeMap.has(key)) {
      routeMap.set(key, {
        from,
        to,
        price: Number(f.price || 0),
        flight: `${f.airline} ${f.flightNumber}`,
      });
    }
  });
  const flightRoutes = Array.from(routeMap.values());

  // Reachable = cities you can fly INTO (arrival) - excludes "Anywhere".
  const reachableCodes = new Set();
  const reachableCities = [];
  flightRoutes.forEach((r) => {
    const code = r.to.code || r.to.city;
    if (!reachableCodes.has(code)) {
      reachableCodes.add(code);
      reachableCities.push(r.to);
    }
  });

  // Origins = cities with at least one departing flight (deduped).
  const originCodes = new Set();
  const originCities = [];
  flightRoutes.forEach((r) => {
    const code = r.from.code || r.from.city;
    if (!originCodes.has(code)) {
      originCodes.add(code);
      originCities.push(r.from);
    }
  });

  // Hotel cities.
  const hotelCitySet = new Set();
  const hotelCities = [];
  (hotels.length ? hotels : []).forEach((h) => {
    const city = h.location?.trim();
    if (!city) return;
    const norm = toDestination(city);
    const code = norm.code || norm.city;
    flightCitySet.add(norm.city);
    if (!hotelCitySet.has(code)) {
      hotelCitySet.add(code);
      hotelCities.push(norm);
    }
  });

  // Available destinations = union of reachable flight cities + hotel cities.
  const availableMap = new Map();
  [...reachableCities, ...hotelCities].forEach((d) => {
    const code = d.code || d.city;
    if (!availableMap.has(code)) availableMap.set(code, d);
  });
  const availableDestinations = Array.from(availableMap.values());

  // Bundle-ready = cities reachable by a flight whose city also has a hotel.
  const availableForTrip = reachableCities.filter((r) => hotelCitySet.has(r.code || r.city));

  const popularCodes = flightRoutes
    .filter((r) => r.from.city.toLowerCase() === "manila")
    .map((r) => r.to.code || r.to.city)
    .slice(0, 6);

  return {
    flights,
    hotels,
    flightRoutes,
    originCities,
    reachableCities,
    hotelCities,
    availableDestinations,
    availableForTrip,
    popularCodes,
  };
}

// True when at least one available flight runs the exact `from → to` route.
export function hasFlightRoute(flightRoutes, fromCity, toCity) {
  if (!fromCity || !toCity) return false;
  const f = toDestination(fromCity);
  const t = toDestination(toCity);
  return flightRoutes.some(
    (r) =>
      (r.from.code || r.from.city).toLowerCase() === (f.code || f.city).toLowerCase() &&
      (r.to.code || r.to.city).toLowerCase() === (t.code || t.city).toLowerCase()
  );
}

export function hasServices(availability) {
  return Boolean(
    availability &&
    (availability.flights?.length > 0 || availability.hotels?.length > 0)
  );
}
