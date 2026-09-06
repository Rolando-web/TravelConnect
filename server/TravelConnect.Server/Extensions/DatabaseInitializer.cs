using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Extensions;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(this WebApplication app, bool reseed = false)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TravelConnectDbContext>();

        // Create database if it doesn't exist
        await db.Database.EnsureCreatedAsync();

        // Ensure the BookingFlights child table exists even on a pre-existing
        // database that was created before this table was introduced. Fresh
        // databases get it automatically via EnsureCreatedAsync.
        await db.Database.ExecuteSqlRawAsync(@"
            IF OBJECT_ID(N'dbo.BookingFlights', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.BookingFlights (
                    Id              int            NOT NULL IDENTITY(1,1) CONSTRAINT PK_BookingFlights PRIMARY KEY,
                    BookingId       int            NOT NULL,
                    SegmentOrder    int            NOT NULL,
                    Airline         nvarchar(max)  NOT NULL,
                    FlightNumber    nvarchar(max)  NOT NULL,
                    DepartureCity   nvarchar(max)  NOT NULL,
                    ArrivalCity     nvarchar(max)  NOT NULL,
                    DepartureTime   nvarchar(max)  NOT NULL,
                    ArrivalTime     nvarchar(max)  NOT NULL,
                    DepartureDate   nvarchar(max)  NOT NULL,
                    Class           nvarchar(max)  NOT NULL,
                    Price           decimal(18,2)  NOT NULL,
                    CONSTRAINT FK_BookingFlights_Bookings_BookingId
                        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings (Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_BookingFlights_BookingId ON dbo.BookingFlights (BookingId);
            END");

        // Ensure the Suppliers.ImageUrl column exists on pre-existing databases
        // (fresh databases get it automatically via EnsureCreatedAsync).
        await db.Database.ExecuteSqlRawAsync(@"
            IF COL_LENGTH('dbo.Suppliers', 'ImageUrl') IS NULL
            BEGIN
                ALTER TABLE dbo.Suppliers ADD ImageUrl nvarchar(max) NOT NULL
                    CONSTRAINT DF_Suppliers_ImageUrl DEFAULT ('');
            END");

        // Ensure the Images table exists even on a pre-existing database.
        await db.Database.ExecuteSqlRawAsync(@"
            IF OBJECT_ID(N'dbo.Images', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.Images (
                    Id           int            NOT NULL IDENTITY(1,1) CONSTRAINT PK_Images PRIMARY KEY,
                    FileName     nvarchar(max)  NOT NULL,
                    ContentType  nvarchar(64)   NOT NULL,
                    Data         varbinary(max) NOT NULL,
                    CreatedAt    datetime2      NOT NULL
                );
            END");

        // Optionally wipe seed tables before re-seeding
        if (reseed)
        {
            db.Packages.RemoveRange(await db.Packages.ToListAsync());
            db.Flights.RemoveRange(await db.Flights.ToListAsync());
            db.Cars.RemoveRange(await db.Cars.ToListAsync());
            db.Hotels.RemoveRange(await db.Hotels.ToListAsync());
            db.Activities.RemoveRange(await db.Activities.ToListAsync());
            db.Destinations.RemoveRange(await db.Destinations.ToListAsync());
            await db.SaveChangesAsync();
        }

        // Seed initial data if empty
        await SeedAsync(db);
    }

    private static async Task SeedAsync(TravelConnectDbContext db)
    {
        // Only seed default admin/staff accounts if none exist yet.
        if (!await db.SystemUsers.AnyAsync())
        {
            var systemUsers = new[]
            {
                new SystemUser { FirebaseUid = "", Email = "superadmin@travelconnect.com", DisplayName = "Juan Dela Cruz", Phone = "+63 917 123 4567", Role = "Super Admin", Department = "Administration", Status = "Active" },
                new SystemUser { FirebaseUid = "", Email = "admin@travelconnect.com", DisplayName = "Maria Santos", Phone = "+63 918 234 5678", Role = "Agency Staff", Department = "Operations", Status = "Active" },
                new SystemUser { FirebaseUid = "", Email = "finance@travelconnect.com", DisplayName = "Pedro Reyes", Phone = "+63 919 345 6789", Role = "Finance Staff", Department = "Finance", Status = "Active" },
                new SystemUser { FirebaseUid = "", Email = "supplier@travelconnect.com", DisplayName = "Ana Garcia", Phone = "+63 920 456 7890", Role = "Supplier", Department = "Supply Chain", Status = "Active" },
            };

            db.SystemUsers.AddRange(systemUsers);
            await db.SaveChangesAsync();
        }

        // Destinations (15)
        if (!await db.Destinations.AnyAsync())
        {
            db.Destinations.AddRange(new[]
            {
                new Destination { Name = "Boracay", Region = "Visayas", Category = "Beach", Description = "World-famous white sand beaches and vibrant nightlife on a small island paradise.", ImageUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", Status = "Active" },
                new Destination { Name = "Palawan", Region = "Visayas", Category = "Island", Description = "Unesco-listed underground river and limestone karst lagoons of El Nido and Coron.", ImageUrl = "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80", Status = "Active" },
                new Destination { Name = "Tokyo", Region = "Asia", Category = "Urban", Description = "A dazzling fusion of ancient temples, neon skylines, and world-class cuisine.", ImageUrl = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80", Status = "Active" },
                new Destination { Name = "Kyoto", Region = "Asia", Category = "Cultural", Description = "Historic temples, serene gardens, and geisha districts frozen in time.", ImageUrl = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", Status = "Active" },
                new Destination { Name = "Bali", Region = "Asia", Category = "Island", Description = "Emerald rice terraces, spiritual retreats, and surf-perfect beaches.", ImageUrl = "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", Status = "Active" },
                new Destination { Name = "Paris", Region = "Europe", Category = "Urban", Description = "The city of lights — iconic landmarks, art, fashion, and romance.", ImageUrl = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", Status = "Active" },
                new Destination { Name = "Santorini", Region = "Europe", Category = "Island", Description = "Whitewashed villages clinging to volcanic cliffs over an azure Aegean sea.", ImageUrl = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80", Status = "Active" },
                new Destination { Name = "Dubai", Region = "Middle East", Category = "Urban", Description = "Futuristic skyscrapers, desert safaris, and record-breaking attractions.", ImageUrl = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", Status = "Active" },
                new Destination { Name = "Queenstown", Region = "Oceania", Category = "Adventure", Description = "The adventure capital of the world, set on the shores of crystal-clear Lake Wakatipu.", ImageUrl = "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80", Status = "Active" },
                new Destination { Name = "New York", Region = "North America", Category = "Urban", Description = "The city that never sleeps — Broadway, skyscrapers, and endless energy.", ImageUrl = "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80", Status = "Active" },
                new Destination { Name = "Siargao", Region = "Caraga", Category = "Island", Description = "Surf capital of the Philippines with coconut-lined roads and turquoise lagoons.", ImageUrl = "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", Status = "Active" },
                new Destination { Name = "El Nido", Region = "Visayas", Category = "Island", Description = "Dramatic limestone cliffs, hidden lagoons and some of the world's best island hopping.", ImageUrl = "https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=800&q=80", Status = "Active" },
                new Destination { Name = "Singapore", Region = "Asia", Category = "Urban", Description = "A gleaming city-state of gardens, hawker food and futuristic skyline.", ImageUrl = "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80", Status = "Active" },
                new Destination { Name = "Bangkok", Region = "Asia", Category = "Urban", Description = "Golden temples, floating markets and legendary street food.", ImageUrl = "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", Status = "Active" },
                new Destination { Name = "Taipei", Region = "Asia", Category = "Urban", Description = "Night markets, hot springs and Taipei 101 — a friendly gateway to Taiwan.", ImageUrl = "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80", Status = "Active" },
            });
            await db.SaveChangesAsync();
        }

        // Hotels (10)
        if (!await db.Hotels.AnyAsync())
        {
            db.Hotels.AddRange(new[]
            {
                new Hotel { Name = "White Beach Resort Villas", Location = "Boracay", Description = "Beachfront villas minutes from the famous white sand shoreline.", PricePerNight = 8500m, Rating = 4.8m, Reviews = 312, Amenities = "Free Wi-Fi|Pool|Beachfront|Restaurant|Spa", ImageUrl = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", Status = "Active", RoomsAvailable = 42 },
                new Hotel { Name = "Harbor Bay Grand", Location = "Palawan", Description = "Overwater bungalows with panoramic views of the limestone cliffs.", PricePerNight = 12000m, Rating = 4.9m, Reviews = 487, Amenities = "Pool|Spa|Diving|Free Wi-Fi|Bar", ImageUrl = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80", Status = "Active", RoomsAvailable = 65 },
                new Hotel { Name = "Sakura Garden Hotel", Location = "Tokyo", Description = "Modern comfort in the heart of the city, steps from transit.", PricePerNight = 9800m, Rating = 4.6m, Reviews = 721, Amenities = "Free Wi-Fi|Gym|Restaurant|Concierge|Laundry", ImageUrl = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", Status = "Active", RoomsAvailable = 120 },
                new Hotel { Name = "Kyoto Zen Retreat", Location = "Kyoto", Description = "Traditional ryokan with tatami rooms and a tranquil garden bath.", PricePerNight = 11000m, Rating = 4.9m, Reviews = 268, Amenities = "Onsen|Garden|Tea House|Breakfast|Free Wi-Fi", ImageUrl = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80", Status = "Active", RoomsAvailable = 18 },
                new Hotel { Name = "Bali Cliffside Resort", Location = "Bali", Description = "Luxury villas perched over the Indian Ocean with infinity pools.", PricePerNight = 14500m, Rating = 4.7m, Reviews = 356, Amenities = "Infinity Pool|Spa|Restaurant|Yoga|Free Wi-Fi", ImageUrl = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", Status = "Active", RoomsAvailable = 54 },
                new Hotel { Name = "Le Rêve Paris", Location = "Paris", Description = "Elegant boutique hotel near the Champs-Élysées with classic French charm.", PricePerNight = 16800m, Rating = 4.8m, Reviews = 540, Amenities = "Free Wi-Fi|Bar|Concierge|Room Service|Gym", ImageUrl = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80", Status = "Active", RoomsAvailable = 38 },
                new Hotel { Name = "Aegean Blue Suites", Location = "Santorini", Description = "Cave suites with private plunge pools and caldera sunsets.", PricePerNight = 19200m, Rating = 5.0m, Reviews = 419, Amenities = "Plunge Pool|Breakfast|Airport Shuttle|Bar|Free Wi-Fi", ImageUrl = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", Status = "Active", RoomsAvailable = 27 },
                new Hotel { Name = "Skyline Tower Hotel", Location = "Dubai", Description = "Stay high above the city with panoramic views of the Burj Khalifa.", PricePerNight = 13500m, Rating = 4.7m, Reviews = 634, Amenities = "Infinity Pool|Gym|Restaurant|Spa|Free Wi-Fi", ImageUrl = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80", Status = "Active", RoomsAvailable = 88 },
                new Hotel { Name = "Lakeview Adventure Lodge", Location = "Queenstown", Description = "Charming lodge overlooking Lake Wakatipu near the ski fields.", PricePerNight = 7200m, Rating = 4.5m, Reviews = 302, Amenities = "Free Wi-Fi|Restaurant|Fireplace|Parking|Bar", ImageUrl = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", Status = "Active", RoomsAvailable = 31 },
                new Hotel { Name = "The Manhattan Grand", Location = "New York", Description = "Iconic midtown hotel with skyline views and luxury amenities.", PricePerNight = 21800m, Rating = 4.6m, Reviews = 893, Amenities = "Gym|Bar|Concierge|Free Wi-Fi|Restaurant", ImageUrl = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80", Status = "Active", RoomsAvailable = 150 },
            });
            await db.SaveChangesAsync();
        }

        // Cars (10)
        if (!await db.Cars.AnyAsync())
        {
            db.Cars.AddRange(new[]
            {
                new Car { Name = "Toyota Vios", Type = "Sedan", Location = "Manila", PricePerDay = 1900m, Transmission = "Automatic", Seats = 5, FuelType = "Gasoline", ImageUrl = "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80", Status = "Active" },
                new Car { Name = "Honda Civic", Type = "Sedan", Location = "Cebu", PricePerDay = 2200m, Transmission = "Automatic", Seats = 5, FuelType = "Gasoline", ImageUrl = "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80", Status = "Active" },
                new Car { Name = "Toyota Fortuner", Type = "SUV", Location = "Manila", PricePerDay = 3500m, Transmission = "Automatic", Seats = 7, FuelType = "Diesel", ImageUrl = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80", Status = "Active" },
                new Car { Name = "Mitsubishi Montero", Type = "SUV", Location = "Davao", PricePerDay = 3400m, Transmission = "Automatic", Seats = 7, FuelType = "Diesel", ImageUrl = "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80", Status = "Active" },
                new Car { Name = "Nissan Almera", Type = "Sedan", Location = "Iloilo", PricePerDay = 1700m, Transmission = "Manual", Seats = 5, FuelType = "Gasoline", ImageUrl = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80", Status = "Active" },
                new Car { Name = "Hyundai Stargazer", Type = "MPV", Location = "Manila", PricePerDay = 3000m, Transmission = "Automatic", Seats = 7, FuelType = "Gasoline", ImageUrl = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80", Status = "Active" },
                new Car { Name = "Toyota Hilux", Type = "Pickup", Location = "Baguio", PricePerDay = 3800m, Transmission = "Manual", Seats = 5, FuelType = "Diesel", ImageUrl = "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800&q=80", Status = "Active" },
                new Car { Name = "Toyota Hiace", Type = "Van", Location = "Cebu", PricePerDay = 4200m, Transmission = "Manual", Seats = 14, FuelType = "Diesel", ImageUrl = "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80", Status = "Active" },
                new Car { Name = "Suzuki Jimny", Type = "SUV", Location = "Puerto Princesa", PricePerDay = 2600m, Transmission = "Manual", Seats = 4, FuelType = "Gasoline", ImageUrl = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80", Status = "Active" },
                new Car { Name = "Hyundai Accent", Type = "Sedan", Location = "Manila", PricePerDay = 1600m, Transmission = "Automatic", Seats = 5, FuelType = "Gasoline", ImageUrl = "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800&q=80", Status = "Active" },
            });
            await db.SaveChangesAsync();
        }

        // Deals / Packages (10)
        if (!await db.Packages.AnyAsync())
        {
            db.Packages.AddRange(new[]
            {
                new Package { Name = "Boracay Beach Escape", Location = "Boracay, Visayas", Description = "4 days of sun, sand, and island hopping around the Philippines' top beach destination.", Duration = "4D / 3N", Price = 15999m, Rating = 4.8m, Reviews = 210, Tag = "Best Seller", ImageUrl = "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80", Status = "Featured", Itinerary = "Day 1: Arrival & White Beach|Day 2: Island Hopping|Day 3: Water Sports & Leisure|Day 4: Departure", Inclusions = "3 nights hotel|Daily breakfast|Island hopping tour|Airport transfers", Exclusions = "Airfare|Meals not mentioned|Personal expenses" },
                new Package { Name = "Palawan Underground River Tour", Location = "Palawan, Visayas", Description = "Discover the Unesco-listed subterranean river and crystal lagoons of Puerto Princesa.", Duration = "3D / 2N", Price = 12800m, Rating = 4.9m, Reviews = 175, Tag = "WONDER", ImageUrl = "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Underground River|Day 3: Departure", Inclusions = "2 nights hotel|Underground river tour|Breakfast daily|Transfers", Exclusions = "Airfare|Lunch & dinner|Extras" },
                new Package { Name = "Tokyo City Lights", Location = "Tokyo, Japan", Description = "Explore neon districts, historic temples, and world-class dining in Japan's capital.", Duration = "5D / 4N", Price = 32500m, Rating = 4.7m, Reviews = 340, Tag = "TRENDING", ImageUrl = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Asakusa & Shibuya|Day 3: Mount Fuji Day Trip|Day 4: Shopping & Shinjuku|Day 5: Departure", Inclusions = "4 nights hotel|Daily breakfast|Mt. Fuji day tour|Airport transfers", Exclusions = "Airfare|Meals|Travel insurance" },
                new Package { Name = "Kyoto Cultural Immersion", Location = "Kyoto, Japan", Description = "Step back in time through temples, tea ceremonies, and geisha streets.", Duration = "4D / 3N", Price = 28800m, Rating = 4.9m, Reviews = 150, Tag = "CULTURAL", ImageUrl = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Golden Pavilion & Tea Ceremony|Day 3: Fushimi Inari & Gion|Day 4: Departure", Inclusions = "3 nights ryokan|Breakfast daily|Tea ceremony|Public transport pass", Exclusions = "Airfare|Meals|Extras" },
                new Package { Name = "Bali Honeymoon Paradise", Location = "Bali, Indonesia", Description = "Romantic island getaway with spa treatments and sunset dinners by the sea.", Duration = "6D / 5N", Price = 39600m, Rating = 4.8m, Reviews = 264, Tag = "ROMANTIC", ImageUrl = "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Ubud Rice Terraces|Day 3: Spa & Beach Club|Day 4: Nusa Penida|Day 5: Sunset Cruise|Day 6: Departure", Inclusions = "5 nights resort|Daily breakfast|Romance package|Airport transfers", Exclusions = "Airfare|Lunch & dinner|Optional tours" },
                new Package { Name = "Paris Art & Romance", Location = "Paris, France", Description = "The Eiffel Tower, Louvre, and Seine cruises wrapped in classic Parisian charm.", Duration = "5D / 4N", Price = 47800m, Rating = 4.7m, Reviews = 198, Tag = "LUXURY", ImageUrl = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Louvre & Eiffel Tower|Day 3: Versailles|Day 4: Seine Cruise & Montmartre|Day 5: Departure", Inclusions = "4 nights hotel|Daily breakfast|Museum passes|Seine cruise", Exclusions = "Airfare|Meals|Extras" },
                new Package { Name = "Santorini Sunset Escape", Location = "Santorini, Greece", Description = "Whitewashed cliffs, caldera sunsets, and Aegean island magic.", Duration = "4D / 3N", Price = 42900m, Rating = 4.9m, Reviews = 178, Tag = "ICONIC", ImageUrl = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Oia & Fira|Day 3: Volcano & Hot Springs|Day 4: Departure", Inclusions = "3 nights cave hotel|Daily breakfast|Catamaran cruise", Exclusions = "Airfare|Meals|Extras" },
                new Package { Name = "Dubai Luxury Escape", Location = "Dubai, UAE", Description = "Desert safaris, Burj Khalifa views, and premium city living.", Duration = "4D / 3N", Price = 38500m, Rating = 4.6m, Reviews = 221, Tag = "LUXURY", ImageUrl = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Burj Khalifa & City Tour|Day 3: Desert Safari|Day 4: Departure", Inclusions = "3 nights hotel|Daily breakfast|Desert safari|Airport transfers", Exclusions = "Airfare|Meals|Optional tours" },
                new Package { Name = "Queenstown Adventure Week", Location = "Queenstown, New Zealand", Description = "Thrills, lakes, and landscapes — world-class adventure in the Southern Alps.", Duration = "7D / 6N", Price = 51200m, Rating = 4.8m, Reviews = 143, Tag = "ADVENTURE", ImageUrl = "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Lake Cruise|Day 3: Bungy & Jet Boating|Day 4: Milford Sound|Day 5: Ski Day|Day 6: Freedom Day|Day 7: Departure", Inclusions = "6 nights lodge|Daily breakfast|Milford Sound tour|Adventure pass", Exclusions = "Airfare|Meals|Gear rental" },
                new Package { Name = "New York City Break", Location = "New York, USA", Description = "Broadway, Central Park, and the bustling energy of Manhattan.", Duration = "5D / 4N", Price = 46800m, Rating = 4.6m, Reviews = 290, Tag = "URBAN", ImageUrl = "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Central Park & Times Square|Day 3: Statue of Liberty|Day 4: Broadway Show|Day 5: Departure", Inclusions = "4 nights hotel|Broadway ticket|Liberty cruise|City passes", Exclusions = "Airfare|Meals|Extras" },
                // ── Affordable Manila/PHP-origin flight + hotel combos ────────
                new Package { Name = "Cebu City Lights & Mactan Beach", Location = "Cebu, Visayas", Description = "A quick, budget-friendly city-and-beach escape — the perfect weekend break from Manila.", Duration = "3D / 2N", Price = 12900m, Rating = 4.6m, Reviews = 134, Tag = "BUDGET", ImageUrl = "https://images.unsplash.com/photo-1559399274-6fd2e29cb54a?w=800&q=80", Status = "Featured", Itinerary = "Day 1: Arrival & City Tour|Day 2: Mactan Beach & Island Hop|Day 3: Departure", Inclusions = "2 nights beachfront hotel|Daily breakfast|City tour|Airport transfers", Exclusions = "Airfare|Lunch & dinner|Souvenirs" },
                new Package { Name = "Boracay Budget Beach Break", Location = "Boracay, Visayas", Description = "White sand, island hopping and sunshine at a price that fits any traveler's wallet.", Duration = "3D / 2N", Price = 11900m, Rating = 4.5m, Reviews = 189, Tag = "BEST VALUE", ImageUrl = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival & White Beach|Day 2: Island Hopping|Day 3: Departure", Inclusions = "2 nights beach resort|Daily breakfast|Island hopping|Transfers", Exclusions = "Airfare|Meals not included|Extras" },
                new Package { Name = "El Nido Island-Hopping Adventure", Location = "El Nido, Palawan", Description = "Pristine lagoons, hidden beaches and towering limestone cliffs on a classic island-hopping route.", Duration = "4D / 3N", Price = 18900m, Rating = 4.9m, Reviews = 167, Tag = "ADVENTURE", ImageUrl = "https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival & Town|Day 2: Tour A Lagoons|Day 3: Tour C & Nacpan Beach|Day 4: Departure", Inclusions = "3 nights beach lodge|Daily breakfast|2 island-hopping tours|Transfers", Exclusions = "Airfare|Lunch & dinner|Eco fees" },
                new Package { Name = "Siargao Surf & Island Break", Location = "Siargao, Caraga", Description = "Surf the legendary Cloud 9 and unwind on turquoise lagoons on the Philippines' surf capital.", Duration = "4D / 3N", Price = 17500m, Rating = 4.8m, Reviews = 112, Tag = "CHILL", ImageUrl = "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival & Cloud 9|Day 2: Island Hopping|Day 3: Sugba Lagoon|Day 4: Departure", Inclusions = "3 nights surf villa|Daily breakfast|Island-hopping tour|Transfers", Exclusions = "Airfare|Meals|Surf board rental" },
                new Package { Name = "Singapore City Lights", Location = "Singapore", Description = "Gardens by the Bay, hawker feasts and world-class skyline — a short, value-packed Asian city break.", Duration = "4D / 3N", Price = 29500m, Rating = 4.7m, Reviews = 213, Tag = "TRENDING", ImageUrl = "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival & Marina Bay|Day 2: Gardens by the Bay & Sentosa|Day 3: Chinatown & Shopping|Day 4: Departure", Inclusions = "3 nights city hotel|Daily breakfast|Sentosa pass|Airport transfers", Exclusions = "Airfare|Meals|Visa (if applicable)" },
                new Package { Name = "Bangkok Temples & Street Food", Location = "Bangkok, Thailand", Description = "Gilded temples, floating markets and legendary street food on an affordable Thailand city break.", Duration = "4D / 3N", Price = 24800m, Rating = 4.6m, Reviews = 176, Tag = "BEST VALUE", ImageUrl = "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival & Grand Palace|Day 2: Floating Market|Day 3: Chatuchak & Night Market|Day 4: Departure", Inclusions = "3 nights city hotel|Daily breakfast|Grand Palace ticket|Airport transfers", Exclusions = "Airfare|Meals|Visa (if applicable)" },
                new Package { Name = "Taipei Foodie & City Tour", Location = "Taipei, Taiwan", Description = "Night markets, hot springs and skyline views in one of Asia's easiest and most wallet-friendly cities.", Duration = "4D / 3N", Price = 22500m, Rating = 4.7m, Reviews = 143, Tag = "FOODIE", ImageUrl = "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival & Taipei 101|Day 2: Shifen & Jiufen|Day 3: Yangmingshan & Night Market|Day 4: Departure", Inclusions = "3 nights city hotel|Daily breakfast|Day tour to Jiufen|Airport transfers", Exclusions = "Airfare|Meals|Extras" },
                new Package { Name = "Tokyo Value Escape", Location = "Tokyo, Japan", Description = "Neon districts, temples and iconic sights — a friendly-priced first taste of Japan for savvy travelers.", Duration = "5D / 4N", Price = 30900m, Rating = 4.6m, Reviews = 157, Tag = "BUDGET", ImageUrl = "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&q=80", Status = "Active", Itinerary = "Day 1: Arrival|Day 2: Asakusa & Shibuya|Day 3: Mt. Fuji Day Trip|Day 4: Akihabara & Ginza|Day 5: Departure", Inclusions = "4 nights budget hotel|Daily breakfast|Mt. Fuji day tour|Public transport pass", Exclusions = "Airfare|Meals|Extras" },
            });
            await db.SaveChangesAsync();
        }

        // Suppliers (linked to their packages once both exist)
        if (!await db.Suppliers.AnyAsync())
        {
            db.Suppliers.AddRange(new[]
            {
                new Supplier { CompanyName = "White Beach Resort Group", ImageUrl = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", ContactName = "Carlo Mendez", ContactEmail = "reservations@whitebeach.ph", ContactPhone = "+63 917 555 0101", Type = "Hotel", Rating = 4.8m, Status = "Active" },
                new Supplier { CompanyName = "Palawan Island Escapes", ImageUrl = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80", ContactName = "Rica Salvador", ContactEmail = "hello@palawanescapes.ph", ContactPhone = "+63 918 555 0102", Type = "Hotel", Rating = 4.9m, Status = "Active" },
                new Supplier { CompanyName = "Sakura Travel Partners", ImageUrl = "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80", ContactName = "Kenji Tanaka", ContactEmail = "bookings@sakuratravel.jp", ContactPhone = "+81 3 5555 0103", Type = "Hotel", Rating = 4.7m, Status = "Active" },
                new Supplier { CompanyName = "Nusa Hospitality Group", ImageUrl = "https://images.unsplash.com/photo-1589391887305-86d93d8b0e62?w=800&q=80", ContactName = "Putu Wirya", ContactEmail = "stay@nusahospitality.id", ContactPhone = "+62 361 555 0104", Type = "Hotel", Rating = 4.8m, Status = "Active" },
                new Supplier { CompanyName = "Paris Luxury Concierge", ImageUrl = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80", ContactName = "Éloise Moreau", ContactEmail = "concierge@parislux.fr", ContactPhone = "+33 1 55 55 0105", Type = "Hotel", Rating = 4.6m, Status = "Review" },
                new Supplier { CompanyName = "Bluewater Tours & Transport", ImageUrl = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80", ContactName = "Miguel Robles", ContactEmail = "ops@bluewatertours.ph", ContactPhone = "+63 919 555 0106", Type = "Tour Op.", Rating = 4.5m, Status = "Active" },
            });
            await db.SaveChangesAsync();

            // Link recently seeded packages to suppliers by location keyword.
            var supplierLinks = new[]
            {
                (Keyword: "boracay", SupplierId: 1),
                (Keyword: "palawan", SupplierId: 2),
                (Keyword: "el nido", SupplierId: 2),
                (Keyword: "japan", SupplierId: 3),
                (Keyword: "bali", SupplierId: 4),
                (Keyword: "paris", SupplierId: 5),
                (Keyword: "cebu", SupplierId: 6),
            };
            foreach (var link in supplierLinks)
            {
                var pkgs = await db.Packages
                    .Where(p => p.Location != null && p.Location.ToLower().Contains(link.Keyword))
                    .ToListAsync();
                foreach (var p in pkgs) p.SupplierId = link.SupplierId;
            }
            await db.SaveChangesAsync();
        }

        // Flights (10)
        if (!await db.Flights.AnyAsync())
        {
            db.Flights.AddRange(new[]
            {
                new Flight { Airline = "Philippine Airlines", FlightNumber = "PR 102", DepartureCity = "Manila", ArrivalCity = "Cebu", DepartureTime = "07:00", ArrivalTime = "08:15", DepartureDate = "2026-09-15", Price = 4200m, Class = "Economy", SeatsAvailable = 120, ImageUrl = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Cebu Pacific", FlightNumber = "5J 501", DepartureCity = "Manila", ArrivalCity = "Boracay", DepartureTime = "09:30", ArrivalTime = "10:40", DepartureDate = "2026-09-16", Price = 3800m, Class = "Economy", SeatsAvailable = 150, ImageUrl = "https://images.unsplash.com/photo-1540339832862-474599807a5e?w=800&q=80", Status = "Active" },
                new Flight { Airline = "PAL Express", FlightNumber = "2P 210", DepartureCity = "Manila", ArrivalCity = "Puerto Princesa", DepartureTime = "11:00", ArrivalTime = "12:30", DepartureDate = "2026-09-17", Price = 4600m, Class = "Economy", SeatsAvailable = 130, ImageUrl = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", Status = "Active" },
                new Flight { Airline = "ANA", FlightNumber = "NH 818", DepartureCity = "Manila", ArrivalCity = "Tokyo", DepartureTime = "20:15", ArrivalTime = "02:00", DepartureDate = "2026-09-18", Price = 28500m, Class = "Economy", SeatsAvailable = 90, ImageUrl = "https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Japan Airlines", FlightNumber = "JL 742", DepartureCity = "Manila", ArrivalCity = "Osaka", DepartureTime = "13:30", ArrivalTime = "21:00", DepartureDate = "2026-09-19", Price = 31000m, Class = "Economy", SeatsAvailable = 110, ImageUrl = "https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Singapore Airlines", FlightNumber = "SQ 921", DepartureCity = "Manila", ArrivalCity = "Singapore", DepartureTime = "16:00", ArrivalTime = "19:45", DepartureDate = "2026-09-20", Price = 24000m, Class = "Business", SeatsAvailable = 45, ImageUrl = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Emirates", FlightNumber = "EK 335", DepartureCity = "Manila", ArrivalCity = "Dubai", DepartureTime = "22:45", ArrivalTime = "04:30", DepartureDate = "2026-09-21", Price = 46000m, Class = "Economy", SeatsAvailable = 150, ImageUrl = "https://images.unsplash.com/photo-1540339832862-474599807a5e?w=800&q=80", Status = "Active" },
                new Flight { Airline = "KLM", FlightNumber = "KL 806", DepartureCity = "Manila", ArrivalCity = "Amsterdam", DepartureTime = "01:30", ArrivalTime = "09:15", DepartureDate = "2026-09-22", Price = 58000m, Class = "Economy", SeatsAvailable = 160, ImageUrl = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Qantas", FlightNumber = "QF 20", DepartureCity = "Manila", ArrivalCity = "Sydney", DepartureTime = "08:45", ArrivalTime = "19:30", DepartureDate = "2026-09-23", Price = 52000m, Class = "Economy", SeatsAvailable = 140, ImageUrl = "https://images.unsplash.com/photo-1540339832862-474599807a5e?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Delta", FlightNumber = "DL 440", DepartureCity = "Manila", ArrivalCity = "New York", DepartureTime = "23:55", ArrivalTime = "11:00", DepartureDate = "2026-09-24", Price = 82000m, Class = "Business", SeatsAvailable = 40, ImageUrl = "https://images.unsplash.com/photo-1540339832862-474599807a5e?w=800&q=80", Status = "Active" },
                // ── Affordable Manila-origin routes for the budget flight combos ──
                new Flight { Airline = "Cebu Pacific", FlightNumber = "5J 585", DepartureCity = "Manila", ArrivalCity = "Cebu", DepartureTime = "06:30", ArrivalTime = "07:45", DepartureDate = "2026-09-25", Price = 2900m, Class = "Economy", SeatsAvailable = 140, ImageUrl = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Air Swift", FlightNumber = "DG 712", DepartureCity = "Manila", ArrivalCity = "Siargao", DepartureTime = "10:00", ArrivalTime = "11:40", DepartureDate = "2026-09-25", Price = 5200m, Class = "Economy", SeatsAvailable = 72, ImageUrl = "https://images.unsplash.com/photo-1540339832862-474599807a5e?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Air Swift", FlightNumber = "DG 624", DepartureCity = "Manila", ArrivalCity = "El Nido", DepartureTime = "08:15", ArrivalTime = "09:45", DepartureDate = "2026-09-26", Price = 6300m, Class = "Economy", SeatsAvailable = 60, ImageUrl = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Scoot", FlightNumber = "TR 395", DepartureCity = "Manila", ArrivalCity = "Singapore", DepartureTime = "12:10", ArrivalTime = "15:40", DepartureDate = "2026-09-27", Price = 8900m, Class = "Economy", SeatsAvailable = 130, ImageUrl = "https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80", Status = "Active" },
                new Flight { Airline = "Thai Airways", FlightNumber = "TG 621", DepartureCity = "Manila", ArrivalCity = "Bangkok", DepartureTime = "21:30", ArrivalTime = "23:50", DepartureDate = "2026-09-28", Price = 8200m, Class = "Economy", SeatsAvailable = 120, ImageUrl = "https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80", Status = "Active" },
                new Flight { Airline = "EVA Air", FlightNumber = "BR 272", DepartureCity = "Manila", ArrivalCity = "Taipei", DepartureTime = "14:05", ArrivalTime = "16:20", DepartureDate = "2026-09-29", Price = 7800m, Class = "Economy", SeatsAvailable = 110, ImageUrl = "https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80", Status = "Active" },
                new Flight { Airline = "ZIPAIR", FlightNumber = "ZG 24", DepartureCity = "Manila", ArrivalCity = "Tokyo", DepartureTime = "09:45", ArrivalTime = "15:20", DepartureDate = "2026-09-30", Price = 24000m, Class = "Economy", SeatsAvailable = 100, ImageUrl = "https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80", Status = "Active" },
            });
            await db.SaveChangesAsync();
        }

        // Activities / Services (10)
        if (!await db.Activities.AnyAsync())
        {
            db.Activities.AddRange(new[]
            {
                new Activity { Name = "Island Hopping Tour", Location = "Boracay", Description = "Jump between white sand beaches and snorkeling spots across the island chain.", Price = 1800m, Duration = "8 Hours", Rating = 4.8m, Reviews = 245, ImageUrl = "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80", Status = "Active" },
                new Activity { Name = "Underground River Tour", Location = "Puerto Princesa", Description = "Boat ride through the Unesco-listed subterranean river cave system.", Price = 2200m, Duration = "4 Hours", Rating = 4.9m, Reviews = 312, ImageUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", Status = "Active" },
                new Activity { Name = "Mount Fuji Day Trip", Location = "Tokyo", Description = "Full-day guided excursion to the iconic summit and surrounding lakes.", Price = 6800m, Duration = "12 Hours", Rating = 4.7m, Reviews = 180, ImageUrl = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", Status = "Active" },
                new Activity { Name = "Traditional Tea Ceremony", Location = "Kyoto", Description = "Authentic Japanese tea ceremony led by a certified tea master.", Price = 2500m, Duration = "1.5 Hours", Rating = 4.9m, Reviews = 150, ImageUrl = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80", Status = "Active" },
                new Activity { Name = "Bali Spa Retreat", Location = "Bali", Description = "Full-body traditional massage in a serene jungle-side spa.", Price = 3200m, Duration = "3 Hours", Rating = 4.8m, Reviews = 220, ImageUrl = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80", Status = "Active" },
                new Activity { Name = "Seine River Cruise", Location = "Paris", Description = "Evening illuminated cruise past the Eiffel Tower and Notre-Dame.", Price = 4500m, Duration = "1 Hour", Rating = 4.6m, Reviews = 410, ImageUrl = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", Status = "Active" },
                new Activity { Name = "Caldera Sunset Cruise", Location = "Santorini", Description = "Catamaran sailing with dinner and sunset views over the Aegean.", Price = 9800m, Duration = "4 Hours", Rating = 5.0m, Reviews = 175, ImageUrl = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80", Status = "Active" },
                new Activity { Name = "Desert Safari", Location = "Dubai", Description = "Dune bashing, camel rides, and BBQ dinner in the golden desert.", Price = 5200m, Duration = "6 Hours", Rating = 4.7m, Reviews = 389, ImageUrl = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", Status = "Active" },
                new Activity { Name = "Milford Sound Cruise", Location = "Queenstown", Description = "Scenic one-day coach and boat journey through the dramatic fjord.", Price = 7500m, Duration = "12 Hours", Rating = 4.9m, Reviews = 198, ImageUrl = "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80", Status = "Active" },
                new Activity { Name = "Statue of Liberty Cruise", Location = "New York", Description = "Harbor cruise with panoramic views of Lower Manhattan and Lady Liberty.", Price = 2800m, Duration = "2 Hours", Rating = 4.6m, Reviews = 520, ImageUrl = "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80", Status = "Active" },
            });
            await db.SaveChangesAsync();
        }
    }
}