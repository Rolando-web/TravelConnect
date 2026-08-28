export const CARS = [
  {
    id: 201,
    name: "Toyota RAV4 Hybrid SUV (2025)",
    type: "SUV / Crossover",
    seats: 5,
    transmission: "Automatic",
    fuel: "Hybrid / Petrol",
    dailyRate: 3500,
    originalRate: 4800,
    img: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1600&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&q=85",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=85",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85",
    ],
    badge: "MOST POPULAR",
    location: "Manila / Airport Pick-Up",
    inclusions: ["Unlimited Mileage", "Collision Damage Waiver (CDW)", "GPS Navigation", "Free Airport Pick-up & Drop-off"],
    shortDesc:
      "The go-to hybrid SUV for island road trips — spacious, fuel-efficient, and ready with GPS and full insurance from the airport.",
  },
  {
    id: 202,
    name: "Mitsubishi Xpander Cross 7-Seater",
    type: "MPV / Family Van",
    seats: 7,
    transmission: "Automatic",
    fuel: "Petrol",
    dailyRate: 3200,
    originalRate: 4200,
    img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=85",
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&q=85",
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=85",
    ],
    badge: "FAMILY FAVORITE",
    location: "Manila / Airport Pick-Up",
    inclusions: ["Unlimited Mileage", "Comprehensive Insurance", "Child Seat Available", "24/7 Roadside Assistance"],
    shortDesc:
      "Room for the whole family — seven seats, child seat options, and round-the-clock roadside support for worry-free trips.",
  },
  {
    id: 203,
    name: "Mini Cooper Convertible S",
    type: "Convertible / Sport",
    seats: 4,
    transmission: "Automatic",
    fuel: "Petrol",
    dailyRate: 6500,
    originalRate: 8500,
    img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=85",
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&q=85",
    ],
    badge: "LUXURY CONVERTIBLE",
    location: "Manila / Airport Pick-Up",
    inclusions: ["Retractable Roof", "Harman Kardon Sound", "Full Risk Coverage", "Island Delivery"],
    shortDesc:
      "Top-down coastal drives with premium sound and full coverage — delivered to your island resort on request.",
  },
  {
    id: 204,
    name: "Toyota HiAce Commuter Van",
    type: "Passenger Van",
    seats: 12,
    transmission: "Manual",
    fuel: "Diesel",
    dailyRate: 4500,
    originalRate: 5800,
    img: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1600&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1200&q=85",
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&q=85",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=85",
    ],
    badge: "GROUP TOURS",
    location: "Manila / Airport Pick-Up",
    inclusions: ["Dedicated Driver Available", "Unlimited Luggage Space", "Full Air-Conditioning", "Inter-island Ferry Permitted"],
    shortDesc:
      "Built for group tours and ferry hops — room for twelve, optional dedicated driver, and luggage space for the whole crew.",
  },
  {
    id: 205,
    name: "Honda Civic RS Turbo",
    type: "Sedan",
    seats: 5,
    transmission: "Automatic",
    fuel: "Petrol",
    dailyRate: 2800,
    originalRate: 3600,
    img: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1600&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=85",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=85",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85",
    ],
    badge: "EXECUTIVE SEDAN",
    location: "Manila / Airport Pick-Up",
    inclusions: ["Unlimited Mileage", "Leather Interior", "Apple CarPlay / Android Auto", "Full Insurance"],
    shortDesc:
      "Sleek executive sedan with leather interior and full smartphone integration — ideal for city runs and airport transfers.",
  },
];

export function getCarById(id) {
  return CARS.find((c) => c.id === parseInt(id, 10));
}

export function toCarBooking(car, days = 3) {
  return {
    id: `CAR-${car.id}`,
    name: `${car.name} Rental (${car.type})`,
    location: car.location,
    price: car.dailyRate * days,
    original: car.originalRate * days,
    duration: `${days} Days Rental`,
    img: car.img,
    category: "car",
  };
}
