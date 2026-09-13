// Offline / production fallback deal packages shown whenever the backend API
// is unreachable (e.g. the production build has no VITE_API_URL set). Mirrors
// the packages seeded into SQL Server by DatabaseInitializer.cs.
export const FALLBACK_DEALS = [
  {
    id: 1,
    name: "Boracay Beach Escape",
    location: "Boracay, Visayas",
    description: "4 days of sun, sand, and island hopping around the Philippines' top beach destination.",
    duration: "4D / 3N",
    price: 15999,
    rating: 4.8,
    reviews: 210,
    tag: "Best Seller",
    imageUrl: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
    inclusions: "3 nights hotel|Daily breakfast|Island hopping tour|Airport transfers"
  },
  {
    id: 2,
    name: "Palawan Underground River Tour",
    location: "Palawan, Visayas",
    description: "Discover the Unesco-listed subterranean river and crystal lagoons of Puerto Princesa.",
    duration: "3D / 2N",
    price: 12800,
    rating: 4.9,
    reviews: 175,
    tag: "WONDER",
    imageUrl: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80",
    inclusions: "2 nights hotel|Underground river tour|Breakfast daily|Transfers"
  },
  {
    id: 3,
    name: "Tokyo City Lights",
    location: "Tokyo, Japan",
    description: "Explore neon districts, historic temples, and world-class dining in Japan's capital.",
    duration: "5D / 4N",
    price: 32500,
    rating: 4.7,
    reviews: 340,
    tag: "TRENDING",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    inclusions: "4 nights hotel|Daily breakfast|Mt. Fuji day tour|Airport transfers"
  },
  {
    id: 4,
    name: "Kyoto Cultural Immersion",
    location: "Kyoto, Japan",
    description: "Step back in time through temples, tea ceremonies, and geisha streets.",
    duration: "4D / 3N",
    price: 28800,
    rating: 4.9,
    reviews: 150,
    tag: "CULTURAL",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    inclusions: "3 nights ryokan|Breakfast daily|Tea ceremony|Public transport pass"
  },
  {
    id: 5,
    name: "Bali Honeymoon Paradise",
    location: "Bali, Indonesia",
    description: "Romantic island getaway with spa treatments and sunset dinners by the sea.",
    duration: "6D / 5N",
    price: 39600,
    rating: 4.8,
    reviews: 264,
    tag: "ROMANTIC",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    inclusions: "5 nights resort|Daily breakfast|Romance package|Airport transfers"
  },
  {
    id: 6,
    name: "Paris Art & Romance",
    location: "Paris, France",
    description: "The Eiffel Tower, Louvre, and Seine cruises wrapped in classic Parisian charm.",
    duration: "5D / 4N",
    price: 47800,
    rating: 4.7,
    reviews: 198,
    tag: "LUXURY",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
    inclusions: "4 nights hotel|Daily breakfast|Museum passes|Seine cruise"
  },
  {
    id: 7,
    name: "Santorini Sunset Escape",
    location: "Santorini, Greece",
    description: "Whitewashed cliffs, caldera sunsets, and Aegean island magic.",
    duration: "4D / 3N",
    price: 42900,
    rating: 4.9,
    reviews: 178,
    tag: "ICONIC",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
    inclusions: "3 nights cave hotel|Daily breakfast|Catamaran cruise"
  },
  {
    id: 8,
    name: "Dubai Luxury Escape",
    location: "Dubai, UAE",
    description: "Desert safaris, Burj Khalifa views, and premium city living.",
    duration: "4D / 3N",
    price: 38500,
    rating: 4.6,
    reviews: 221,
    tag: "LUXURY",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    inclusions: "3 nights hotel|Daily breakfast|Desert safari|Airport transfers"
  },
  {
    id: 9,
    name: "Cebu City Lights & Mactan Beach",
    location: "Cebu, Visayas",
    description: "A quick, budget-friendly city-and-beach escape — the perfect weekend break from Manila.",
    duration: "3D / 2N",
    price: 12900,
    rating: 4.6,
    reviews: 134,
    tag: "BUDGET",
    imageUrl: "https://images.unsplash.com/photo-1559399274-6fd2e29cb54a?w=800&q=80",
    inclusions: "2 nights beachfront hotel|Daily breakfast|City tour|Airport transfers"
  },
  {
    id: 10,
    name: "Boracay Budget Beach Break",
    location: "Boracay, Visayas",
    description: "White sand, island hopping and sunshine at a price that fits any traveler's wallet.",
    duration: "3D / 2N",
    price: 11900,
    rating: 4.5,
    reviews: 189,
    tag: "BEST VALUE",
    imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    inclusions: "2 nights beach resort|Daily breakfast|Island hopping|Transfers"
  },
  {
    id: 11,
    name: "El Nido Island-Hopping Adventure",
    location: "El Nido, Palawan",
    description: "Pristine lagoons, hidden beaches and towering limestone cliffs on a classic island-hopping route.",
    duration: "4D / 3N",
    price: 18900,
    rating: 4.9,
    reviews: 167,
    tag: "ADVENTURE",
    imageUrl: "https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=800&q=80",
    inclusions: "3 nights beach lodge|Daily breakfast|2 island-hopping tours|Transfers"
  },
  {
    id: 12,
    name: "Singapore City Lights",
    location: "Singapore",
    description: "Gardens by the Bay, hawker feasts and world-class skyline — a short, value-packed Asian city break.",
    duration: "4D / 3N",
    price: 29500,
    rating: 4.7,
    reviews: 213,
    tag: "TRENDING",
    imageUrl: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
    inclusions: "3 nights city hotel|Daily breakfast|Sentosa pass|Airport transfers"
  }
];

// Bundle (combo) deals that mix transport + accommodation into a single
// discounted package: Flight+Hotel+Car, Flight+Hotel or Flight+Car.
// Each component carries its own price so the deal page can show a line-by-line
// breakdown and the "you save X%" badge.
export const COMBO_DEALS = [
  {
    id: "c1",
    name: "Boracay Fly · Stay · Drive Escape",
    location: "Boracay, Visayas",
    description:
      "The complete Boracay bundle: round-trip flights to Caticlan, 3 beachfront nights, and a compact SUV for island runs — all in one discounted package.",
    duration: "4D / 3N",
    price: 25999,
    originalPrice: 31200,
    rating: 4.8,
    reviews: 96,
    tag: "COMBO",
    imageUrl: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
    combo: {
      type: "flight+hotel+car",
      label: "Flight + Hotel + Car",
      perks: ["One booking", "No separate redirects", "Priority airport pick-up"],
      components: [
        {
          type: "flight",
          icon: "✈️",
          name: "Manila → Caticlan (Air Swift DG 624)",
          detail: "Round-trip economy, 20kg checked bag",
          price: 6200
        },
        {
          type: "hotel",
          icon: "🏨",
          name: "Boracay Beachfront Hotel",
          detail: "3 nights, daily breakfast, beachfront view",
          price: 15999
        },
        {
          type: "car",
          icon: "🚗",
          name: "Suzuki Jimny Auto",
          detail: "3 days rental, airport pick-up & drop-off",
          price: 3800
        }
      ]
    },
    inclusions:
      "Round-trip Manila–Caticlan flights|3 nights beachfront hotel|Daily breakfast|3-day SUV rental|Airport pick-up & drop-off|Island hopping tour|Travel insurance (24/7)",
    itinerary:
      "Day 1 — Fly Manila to Caticlan, collect SUV, hotel check-in|Day 2 — Island hopping: Crystal Cove & Puka Shell|Day 3 — Leisure beach day + sunset cruise|Day 4 — Morning checkout, return car, fly home"
  },
  {
    id: "c2",
    name: "Cebu Fly & Drive Weekender",
    location: "Cebu, Visayas",
    description:
      "Beat the weekend traffic with a fast flight plus a rental car — cross from MCIA to the beach or dive town on your own schedule.",
    duration: "3D / 2N",
    price: 9800,
    originalPrice: 12400,
    rating: 4.6,
    reviews: 58,
    tag: "FLY + DRIVE",
    imageUrl: "https://images.unsplash.com/photo-1559399274-6fd2e29cb54a?w=800&q=80",
    combo: {
      type: "flight+car",
      label: "Flight + Car",
      perks: ["E-ticket & rental in one", "Unlimited mileage", "Free 2nd driver"],
      components: [
        {
          type: "flight",
          icon: "✈️",
          name: "Manila → Cebu (Cebu Pacific 5J 577)",
          detail: "Round-trip economy, 15kg checked bag",
          price: 4800
        },
        {
          type: "car",
          icon: "🚗",
          name: "Toyota Wigo Auto",
          detail: "3 days rental, unlimited mileage, free 2nd driver",
          price: 5000
        }
      ]
    },
    inclusions:
      "Round-trip Manila–Cebu flights|3-day Wigo rental|Unlimited mileage|Free 2nd driver|24/7 road assistance|Airport pick-up",
    itinerary:
      "Day 1 — Fly to Cebu, collect car at MCIA|Day 2 — Self-drive to Moalboal & Kawasan|Day 3 — Return car, afternoon flight home"
  },
  {
    id: "c3",
    name: "Siargao Surf & Stay Getaway",
    location: "Siargao, Mindanao",
    description:
      "Direct flight and a cozy surf-village stay — the essentials for catching Cloud 9 and island-hopping the lagoons.",
    duration: "4D / 3N",
    price: 18400,
    originalPrice: 21400,
    rating: 4.9,
    reviews: 74,
    tag: "FLY + STAY",
    imageUrl: "https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=800&q=80",
    combo: {
      type: "flight+hotel",
      label: "Flight + Hotel",
      perks: ["Fast-track check-in", "Free airport shuttle", "Complimentary breakfast"],
      components: [
        {
          type: "flight",
          icon: "✈️",
          name: "Manila → Siargao (PAL PR 2461)",
          detail: "Round-trip economy, 23kg checked bag",
          price: 7400
        },
        {
          type: "hotel",
          icon: "🏨",
          name: "Surfers' Village Lodge",
          detail: "3 nights, beachfront, daily breakfast, shuttle",
          price: 11000
        }
      ]
    },
    inclusions:
      "Round-trip Manila–Siargao flights|3 nights beachfront lodge|Daily breakfast|Airport shuttle|Cloud 9 walk-in access|Island hopping day tour",
    itinerary:
      "Day 1 — Fly to Siargao, settle at the lodge|Day 2 — Cloud 9 surf morning, island hopping|Day 3 — Sugba Lagoon & Magpupungko pools|Day 4 — Breakfast, shuttle back, fly home"
  }
];