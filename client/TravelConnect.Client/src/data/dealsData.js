export const DEALS = [
  {
    id: 1,
    name: "Tokyo Neon & Culture Tour",
    location: "Tokyo, Japan · 5 Days, 4 Nights",
    badge: "EARLY BIRD",
    badgeColor: "bg-amber-500",
    discount: 25,
    original: 105000,
    price: 78750,
    savings: 26250,
    code: "EARLY2027",
    season: "Early Bird",
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1000&q=85",
    rating: 4.9,
    reviewsCount: 342,
    nights: 4,
    spotsLeft: 3,
    bundleType: "flight-hotel-car",
    bundleLabel: "Flight + Hotel + Car Rental",
    shortDesc: "Experience the vibrant energy of Shinjuku, historic temples in Asakusa, and scenic drives to Mt. Fuji with private vehicle rental included.",
    inclusions: {
      flight: {
        airline: "Philippine Airlines (PAL)",
        flightNo: "PR 428 / PR 427",
        route: "MNL (Manila) ✈ NRT (Tokyo Narita) · Roundtrip",
        baggage: "30kg Checked baggage + 7kg Carry-on included",
        cabin: "Economy Class with complimentary inflight meals"
      },
      hotel: {
        name: "Shinjuku Granbell Luxury Hotel",
        stars: 4.5,
        roomType: "Executive Skyline Queen Room",
        perks: ["Free Daily Buffet Breakfast", "High-speed Wi-Fi", "Late Check-out at 1:00 PM"]
      },
      car: {
        model: "Toyota RAV4 SUV (2025 Model)",
        transmission: "Automatic · Hybrid",
        features: ["GPS Navigation", "ETC Card (Toll reader)", "Full Comprehensive Insurance", "Unlimited Mileage"]
      },
      extras: [
        "Tokyo Subway 72-Hour Unlimited Pass",
        "TeamLab Planets Express Ticket",
        "Mt. Fuji & Lake Kawaguchiko Day Tour voucher"
      ]
    },
    itinerary: [
      { day: 1, title: "Arrival in Tokyo & Shinjuku Neon Walk", desc: "Land at Narita Airport, pick up your rental vehicle, check into Shinjuku Granbell Hotel, and enjoy an evening neon walking tour." },
      { day: 2, title: "Asakusa Temple & Skytree Observation", desc: "Visit Senso-ji, Tokyo's oldest temple, shop along Nakamise Street, and head to Tokyo Skytree." },
      { day: 3, title: "Mt. Fuji & Hakone Scenic Drive", desc: "Drive your rental SUV to Lake Kawaguchiko for breathtaking views of Mt. Fuji and Hakone hot springs." },
      { day: 4, title: "Shibuya Crossing, Harajuku & Digital Art", desc: "Immerse yourself in Shibuya Crossing, explore Harajuku fashion, and experience TeamLab Planets." },
      { day: 5, title: "Ginza Shopping & Departure to Manila", desc: "Last-minute souvenir shopping in Ginza, return car at Narita airport, and catch your return flight home." }
    ]
  },
  {
    id: 2,
    name: "Bali Serenity Resort & Coastal Drive",
    location: "Ubud & Seminyak, Indonesia · 7 Days, 6 Nights",
    badge: "TOP RATED",
    badgeColor: "bg-rose-500",
    discount: 20,
    original: 68000,
    price: 54400,
    savings: 13600,
    code: "SUMMER26",
    season: "Seasonal",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1000&q=85",
    rating: 4.8,
    reviewsCount: 289,
    nights: 6,
    spotsLeft: 5,
    bundleType: "flight-hotel-car",
    bundleLabel: "Flight + Hotel + Car Rental",
    shortDesc: "Rejuvenate in Ubud rainforest private pool villas and explore the cliffs of Uluwatu with a dedicated rental car.",
    inclusions: {
      flight: {
        airline: "Cebu Pacific Air",
        flightNo: "5J 279 / 5J 280",
        route: "MNL (Manila) ✈ DPS (Bali Denpasar) · Roundtrip",
        baggage: "20kg Checked baggage + 7kg Carry-on",
        cabin: "Economy Standard Seat Selection"
      },
      hotel: {
        name: "The Kayon Jungle Resort & Spa (Ubud)",
        stars: 5.0,
        roomType: "Kayon Jungle Private Pool Villa",
        perks: ["Complimentary 60-min Balinese Massage for two", "Daily floating breakfast in villa", "Afternoon Tea Service"]
      },
      car: {
        model: "Mitsubishi Xpander 7-Seater",
        transmission: "Automatic",
        features: ["Air Conditioned", "Full Insurance Cover", "Hotel Delivery & Pick-up"]
      },
      extras: [
        "Uluwatu Sunset Kecak Fire Dance VIP Tickets",
        "Tegallalang Rice Terrace Swing Access",
        "Nusa Penida Island Speedboat Day Cruise Voucher"
      ]
    },
    itinerary: [
      { day: 1, title: "Touchdown Bali & Villa Check-In", desc: "Arrive at Denpasar Airport, receive your SUV, and check into your jungle pool villa in Ubud." },
      { day: 2, title: "Ubud Monkey Forest & Rice Terraces", desc: "Explore Sacred Monkey Forest, Tegallalang Rice Terraces, and enjoy floating breakfast." },
      { day: 3, title: "Waterfalls & Temple Blessings", desc: "Drive to Tegenungan Waterfall and Tirta Empul Holy Water Temple." },
      { day: 4, title: "Seminyak Beach Club Vibes", desc: "Transfer to coastal Seminyak, relax at Potato Head Beach Club, and watch the ocean sunset." },
      { day: 5, title: "Uluwatu Cliffside Temple & Kecak Dance", desc: "Drive south to Uluwatu Temple perched on a 70m cliff, followed by traditional Kecak dance." },
      { day: 6, title: "Nusa Penida Day Trip", desc: "Take a speedboat to Nusa Penida to visit Kelingking T-Rex Beach and Angel's Billabong." },
      { day: 7, title: "Souvenir Shopping & Flight Home", desc: "Shop at Kuta Art Market, drop off vehicle, and fly back to Manila." }
    ]
  },
  {
    id: 3,
    name: "Swiss Alps & Scenic Express Package",
    location: "Zurich & Interlaken, Switzerland · 10 Days, 9 Nights",
    badge: "SEASONAL",
    badgeColor: "bg-blue-600",
    discount: 20,
    original: 195000,
    price: 156000,
    savings: 39000,
    code: "SUMMER26",
    season: "Seasonal",
    img: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1000&q=85",
    rating: 4.9,
    reviewsCount: 198,
    nights: 9,
    spotsLeft: 2,
    bundleType: "flight-hotel",
    bundleLabel: "Flight + 5-Star Hotel Stay",
    shortDesc: "Soak in snow-capped peaks, alpine lakes, and historic trains across Zurich, Lucerne, Grindelwald, and Zermatt.",
    inclusions: {
      flight: {
        airline: "Singapore Airlines",
        flightNo: "SQ 915 / SQ 346",
        route: "MNL ✈ SIN ✈ ZRH (Zurich) · Roundtrip",
        baggage: "35kg Checked baggage + 7kg Carry-on",
        cabin: "Premium Economy Class with gourmet meals & free Wi-Fi"
      },
      hotel: {
        name: "Victoria-Jungfrau Grand Hotel & Spa",
        stars: 5.0,
        roomType: "Jungfrau View Deluxe Suite",
        perks: ["Access to Nescens Thermal Spa", "Daily Gourmet Breakfast Buffet", "Welcome Champagne"]
      },
      extras: [
        "10-Day Swiss Travel Rail Pass (1st Class Unlimited Trains)",
        "Jungfraujoch 'Top of Europe' Excursion Ticket",
        "Lake Lucerne Cruise Ticket"
      ]
    },
    itinerary: [
      { day: 1, title: "Flight to Zurich & Old Town Walk", desc: "Arrive in Zurich, check into hotel, and wander through historic Altstadt." },
      { day: 2, title: "Scenic Train to Lucerne", desc: "Board the 1st class train to Lucerne and walk across Chapel Bridge." },
      { day: 3, title: "Mount Titlis Rotair Cable Car", desc: "Ride the revolving cable car up Mt. Titlis for glacier snow walking." },
      { day: 4, title: "Interlaken & Grindelwald First", desc: "Travel to Interlaken nestled between twin lakes." },
      { day: 5, title: "Jungfraujoch - Top of Europe", desc: "Take the Eiger Express to Europe's highest railway station (3,454m)." },
      { day: 6, title: "Glacier Express to Zermatt", desc: "Enjoy panoramic windows on the world's most famous slow express train." },
      { day: 7, title: "Matterhorn Views & Alpine Hiking", desc: "Ride the Gornergrat railway for unobstructed views of the Matterhorn." },
      { day: 8, title: "Montreux & Chillon Castle", desc: "Visit Lake Geneva shoreline and medieval Chillon Castle." },
      { day: 9, title: "Return to Zurich & Fondue Dinner", desc: "Swiss traditional cheese fondue celebration dinner in Zurich." },
      { day: 10, title: "Departure to Manila", desc: "Transfer to Zurich Airport for return flight." }
    ]
  },
  {
    id: 4,
    name: "Paris Romance & Loire Valley Getaway",
    location: "Paris, France · 5 Days, 4 Nights",
    badge: "MEMBER EXCLUSIVE",
    badgeColor: "bg-purple-600",
    discount: 15,
    original: 98000,
    price: 83300,
    savings: 14700,
    code: "WELCOME50",
    season: "Member",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1000&q=85",
    rating: 4.8,
    reviewsCount: 412,
    nights: 4,
    spotsLeft: 4,
    bundleType: "flight-hotel",
    bundleLabel: "Flight + Boutique Hotel",
    shortDesc: "Experience Parisian romance with Eiffel Tower view dining, Seine river cruise, and Versailles palace excursion.",
    inclusions: {
      flight: {
        airline: "Qatar Airways",
        flightNo: "QR 933 / QR 039",
        route: "MNL ✈ DOH ✈ CDG (Paris Charles de Gaulle)",
        baggage: "30kg Checked baggage + 7kg Carry-on",
        cabin: "Economy Class"
      },
      hotel: {
        name: "Hôtel Le Levanthin Paris Opera",
        stars: 4.5,
        roomType: "Balcony Room with City Skyline View",
        perks: ["Fresh French Pastry Breakfast", "Wine & Cheese Welcome Basket", "Free High-Speed Wi-Fi"]
      },
      extras: [
        "Seine River Bateaux Parisiens Dinner Cruise",
        "Skip-the-line Louvre Museum Ticket",
        "Versailles Palace Guided Tour with Transport"
      ]
    },
    itinerary: [
      { day: 1, title: "Bienvenue à Paris & Eiffel Tower Lights", desc: "Arrive in Paris, settle into hotel, and see Eiffel Tower light show." },
      { day: 2, title: "Louvre Museum & Seine Sunset Cruise", desc: "Guided tour of Mona Lisa & Louvre masterpieces, followed by dinner cruise." },
      { day: 3, title: "Palace of Versailles Day Trip", desc: "Explore the Hall of Mirrors and grand gardens of King Louis XIV." },
      { day: 4, title: "Montmartre Art & Champs-Élysées Shopping", desc: "Visit Sacré-Cœur basilica, painter's square, and luxury boutiques." },
      { day: 5, title: "Café Breakfast & Departure", desc: "Enjoy croissants at a street café before private airport transfer." }
    ]
  },
  {
    id: 5,
    name: "Santorini Sunset & Island Hopping",
    location: "Santorini, Greece · 6 Days, 5 Nights",
    badge: "HOT DEAL",
    badgeColor: "bg-orange-500",
    discount: 15,
    original: 92000,
    price: 78200,
    savings: 13800,
    code: "BALI15",
    season: "Flash",
    img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1000&q=85",
    rating: 4.9,
    reviewsCount: 520,
    nights: 5,
    spotsLeft: 2,
    bundleType: "flight-hotel-car",
    bundleLabel: "Flight + Cliffside Resort + Convertible Car",
    shortDesc: "White-washed cliffside villages, caldera views, volcanic wine tasting, and a stylish convertible rental.",
    inclusions: {
      flight: {
        airline: "Emirates",
        flightNo: "EK 335 / EK 209",
        route: "MNL ✈ DXB ✈ ATH ✈ JTR (Santorini Airport)",
        baggage: "30kg Checked baggage + 7kg Carry-on",
        cabin: "Economy Class"
      },
      hotel: {
        name: "Canaves Oia Caldera Suites",
        stars: 5.0,
        roomType: "Infinity Pool Honeymoon Suite",
        perks: ["Caldera view daily breakfast served on private terrace", "Bottle of Vinsanto Greek Wine"]
      },
      car: {
        model: "Mini Cooper Convertible (2025)",
        transmission: "Automatic",
        features: ["Retractable soft top", "GPS", "Full Risk Insurance", "Free Airport Pick-up & Drop-off"]
      },
      extras: [
        "Catamaran Sunset Cruise with BBQ & Open Bar",
        "Volcanic Winery Tour with Sommelier Tasting"
      ]
    },
    itinerary: [
      { day: 1, title: "Arrive in Santorini & Oia Sunset", desc: "Pick up Mini Cooper Convertible, check into cliffside suite, and watch world-famous Oia sunset." },
      { day: 2, title: "Fira Town & Firostefani Hike", desc: "Explore cobblestone paths, blue-domed churches, and local boutiques." },
      { day: 3, title: "Catamaran Cruise & Red Beach", desc: "Sail past Caldera cliffs, swim in hot springs, and feast on fresh seafood." },
      { day: 4, title: "Akrotiri Ruins & Wine Tasting", desc: "Drive convertible to ancient Minoan ruins and Santo Wines tasting deck." },
      { day: 5, title: "Perissa Black Sand Beach", desc: "Relax at beachside lounges in Perissa and Kamari." },
      { day: 6, title: "Farewell Greece & Flight Home", desc: "Return rental car at airport and embark on return journey." }
    ]
  },
  {
    id: 6,
    name: "Maldives Overwater Luxury Escape",
    location: "North Malé Atoll, Maldives · 8 Days, 7 Nights",
    badge: "HONEYMOON",
    badgeColor: "bg-pink-500",
    discount: 10,
    original: 210000,
    price: 189000,
    savings: 21000,
    code: "HONEYMOON",
    season: "Honeymoon",
    img: "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=1000&q=85",
    rating: 5.0,
    reviewsCount: 630,
    nights: 7,
    spotsLeft: 6,
    bundleType: "flight-hotel",
    bundleLabel: "Flight + Overwater Villa + All Inclusive",
    shortDesc: "Turquoise lagoons, private overwater villa with glass floor viewing panels, full board dining, and speedboat transfers.",
    inclusions: {
      flight: {
        airline: "Singapore Airlines",
        flightNo: "SQ 917 / SQ 438",
        route: "MNL ✈ SIN ✈ MLE (Velana International, Maldives)",
        baggage: "35kg Checked baggage + 7kg Carry-on",
        cabin: "Economy Class with priority boarding"
      },
      hotel: {
        name: "Soneva Jani Overwater Resort",
        stars: 5.0,
        roomType: "Water Reserve Villa with Ocean Water Slide",
        perks: ["All-Inclusive Dining (Breakfast, Lunch, Gourmet Dinner)", "Unlimited Premium Drinks", "Private Butler Service"]
      },
      extras: [
        "Roundtrip Luxury Speedboat / Seaplane Transfer",
        "Manta Ray & Turtle Snorkeling Safari",
        "Couples Sunset Dolphin Cruise"
      ]
    },
    itinerary: [
      { day: 1, title: "Arrival in Paradise & Seaplane Transfer", desc: "Touch down in Malé, board seaplane to resort, and check into overwater villa." },
      { day: 2, title: "Snorkeling Safari & Underwater Lagoon", desc: "Discover colorful coral reefs, sea turtles, and clownfish right off your deck." },
      { day: 3, title: "Couples Spa & Private Beach Dinner", desc: "Enjoy 90-min aromatherapy massage and candlelight beach dinner under the stars." },
      { day: 4, title: "Dolphin Cruise & Sunset Cocktails", desc: "Sail on a traditional Maldivian Dhoni with playful wild dolphins." },
      { day: 5, title: "Water Sports & Jet Ski Adventure", desc: "Try stand-up paddleboarding, kayaking, or high-speed jet skiing." },
      { day: 6, title: "Unwind at Private Sandbank", desc: "Exclusive picnic setup on a secluded white sandbank." },
      { day: 7, title: "Stargazing Observatory Dinner", desc: "Dine at the resort's overwater observatory with resident astronomer." },
      { day: 8, title: "Seaplane Transfer & Flight to Manila", desc: "Bid farewell to Maldives and catch your flight home." }
    ]
  }
];
