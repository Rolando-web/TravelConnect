// Central metadata map: city → country / IATA / region / airport.
// Used to enrich airport-style city names into structured destination objects
// regardless of whether the source row is a Flight, Hotel, or seed Destination.
export const CITY_META = {
  Manila: {
    country: "Philippines", code: "MNL", region: "Asia", airport: "Ninoy Aquino Intl",
  },
  Cebu: {
    country: "Philippines", code: "CEB", region: "Asia", airport: "Mactan-Cebu Intl",
  },
  Boracay: {
    country: "Philippines", code: "MPH", region: "Asia", airport: "Boracay Airport",
  },
  Caticlan: {
    country: "Philippines", code: "MPH", region: "Asia", airport: "Boracay Airport",
  },
  "Puerto Princesa": {
    country: "Philippines", code: "PPS", region: "Asia", airport: "Puerto Princesa Intl",
  },
  Palawan: {
    country: "Philippines", code: "PPS", region: "Asia", airport: "Puerto Princesa Intl",
  },
  Davao: {
    country: "Philippines", code: "DVO", region: "Asia", airport: "Francisco Bangoy Intl",
  },
  Iloilo: {
    country: "Philippines", code: "ILO", region: "Asia", airport: "Iloilo Intl",
  },
  Siargao: {
    country: "Philippines", code: "IAO", region: "Asia", airport: "Sayak Airport",
  },
  "El Nido": {
    country: "Philippines", code: "ENI", region: "Asia", airport: "El Nido Airport",
  },
  Baguio: {
    country: "Philippines", code: "BAG", region: "Asia", airport: "Loakan Airport",
  },
  Tokyo: {
    country: "Japan", code: "HND", region: "Asia", airport: "Haneda Airport",
  },
  Osaka: {
    country: "Japan", code: "KIX", region: "Asia", airport: "Kansai Intl",
  },
  Kyoto: {
    country: "Japan", code: "UKY", region: "Asia", airport: "Kyoto Station",
  },
  Singapore: {
    country: "Singapore", code: "SIN", region: "Asia", airport: "Changi Airport",
  },
  Dubai: {
    country: "United Arab Emirates", code: "DXB", region: "Middle East", airport: "Dubai Intl",
  },
  Sydney: {
    country: "Australia", code: "SYD", region: "Oceania", airport: "Kingsford Smith",
  },
  Amsterdam: {
    country: "Netherlands", code: "AMS", region: "Europe", airport: "Schiphol Airport",
  },
  Paris: {
    country: "France", code: "CDG", region: "Europe", airport: "Charles de Gaulle",
  },
  Santorini: {
    country: "Greece", code: "JTR", region: "Europe", airport: "Santorini Intl",
  },
  "New York": {
    country: "United States", code: "JFK", region: "North America", airport: "John F. Kennedy",
  },
  Queenstown: {
    country: "New Zealand", code: "ZQN", region: "Oceania", airport: "Queenstown Airport",
  },
  Bali: {
    country: "Indonesia", code: "DPS", region: "Asia", airport: "Ngurah Rai Intl",
  },
  Taipei: {
    country: "Taiwan", code: "TPE", region: "Asia", airport: "Taoyuan Intl",
  },
  "Hong Kong": {
    country: "Hong Kong", code: "HKG", region: "Asia", airport: "Hong Kong Intl",
  },
  Bangkok: {
    country: "Thailand", code: "BKK", region: "Asia", airport: "Suvarnabhumi",
  },
  Seoul: {
    country: "South Korea", code: "ICN", region: "Asia", airport: "Incheon Intl",
  },
  "Kuala Lumpur": {
    country: "Malaysia", code: "KUL", region: "Asia", airport: "Kuala Lumpur Intl",
  },
  Beijing: {
    country: "China", code: "PEK", region: "Asia", airport: "Beijing Capital",
  },
  London: {
    country: "United Kingdom", code: "LHR", region: "Europe", airport: "Heathrow Airport",
  },
  Milan: {
    country: "Italy", code: "MXP", region: "Europe", airport: "Malpensa Airport",
  },
  Frankfurt: {
    country: "Germany", code: "FRA", region: "Europe", airport: "Frankfurt Airport",
  },
  Rome: {
    country: "Italy", code: "FCO", region: "Europe", airport: "Fiumicino Airport",
  },
  Zurich: {
    country: "Switzerland", code: "ZRH", region: "Europe", airport: "Zurich Airport",
  },
  Barcelona: {
    country: "Spain", code: "BCN", region: "Europe", airport: "Josep Tarradellas",
  },
  Munich: {
    country: "Germany", code: "MUC", region: "Europe", airport: "Munich Airport",
  },
  Madrid: {
    country: "Spain", code: "MAD", region: "Europe", airport: "Adolfo Suárez Barajas",
  },
  "Los Angeles": {
    country: "United States", code: "LAX", region: "North America", airport: "Los Angeles Intl",
  },
  "San Francisco": {
    country: "United States", code: "SFO", region: "North America", airport: "San Francisco Intl",
  },
  Chicago: {
    country: "United States", code: "ORD", region: "North America", airport: "O'Hare Intl",
  },
  Toronto: {
    country: "Canada", code: "YYZ", region: "North America", airport: "Pearson Intl",
  },
  Vancouver: {
    country: "Canada", code: "YVR", region: "North America", airport: "Vancouver Intl",
  },
  Miami: {
    country: "United States", code: "MIA", region: "North America", airport: "Miami Intl",
  },
  Seattle: {
    country: "United States", code: "SEA", region: "North America", airport: "Seattle-Tacoma",
  },
  Dallas: {
    country: "United States", code: "DFW", region: "North America", airport: "Dallas/Fort Worth",
  },
  Atlanta: {
    country: "United States", code: "ATL", region: "North America", airport: "Hartsfield-Jackson",
  },
  "São Paulo": {
    country: "Brazil", code: "GRU", region: "South America", airport: "Guarulhos Intl",
  },
  "Buenos Aires": {
    country: "Argentina", code: "EZE", region: "South America", airport: "Ministro Pistarini",
  },
  Lima: {
    country: "Peru", code: "LIM", region: "South America", airport: "Jorge Chávez Intl",
  },
  Santiago: {
    country: "Chile", code: "SCL", region: "South America", airport: "Arturo Merino Benítez",
  },
  Bogota: {
    country: "Colombia", code: "BOG", region: "South America", airport: "El Dorado Intl",
  },
};

// Normalise a raw city string (case-insensitive, tolerant of whitespace/accents).
export function normalizeCity(city) {
  if (!city) return "";
  return city.trim();
}

// Resolve a city name to a full destination descriptor, using metadata when known.
export function toDestination(city) {
  const key = normalizeCity(city);
  if (!key) return null;
  const meta = CITY_META[key];
  return {
    city: key,
    country: meta?.country || key,
    code: meta?.code || "",
    region: meta?.region || "International",
    airport: meta?.airport || key,
  };
}

// Group an array of destination descriptors into category buckets like the
// legacy destinations.json shape ({ popular, asia, europe, ... }).
export function groupDestinations(list, popularCodes = []) {
  const buckets = {
    popular: [],
    asia: [],
    europe: [],
    north_america: [],
    south_america: [],
    middle_east: [],
    oceania: [],
    international: [],
  };

  list.forEach((d) => {
    const region = (d.region || "International").toLowerCase().replace(/\s+/g, "_");
    if (popularCodes.includes(d.code) || d.isTop) {
      buckets.popular.push(d);
      return;
    }
    if (buckets[region]) buckets[region].push(d);
    else buckets.international.push(d);
  });

  return buckets;
}
