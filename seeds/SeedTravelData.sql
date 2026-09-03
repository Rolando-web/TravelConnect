-- ============================================
-- TravelConnect Seed Data for Testing Bookings
-- Run this in SSMS against the TravelConnect database
-- ============================================

USE [TravelConnect];
GO

-- ============================================
-- 1. FLIGHTS (10) — each with a unique image
-- ============================================
IF NOT EXISTS (SELECT 1 FROM [Flights])
BEGIN
    INSERT INTO [Flights] ([CreatedAt],[UpdatedAt],[Airline],[FlightNumber],[DepartureCity],[ArrivalCity],[DepartureTime],[ArrivalTime],[DepartureDate],[Price],[Class],[SeatsAvailable],[ImageUrl],[Status],[SupplierId])
    VALUES
    (GETUTCDATE(), GETUTCDATE(), 'Philippine Airlines', 'PR 102',  'Manila', 'Cebu',        '07:00', '08:15', '2026-09-15', 4200.00,  'Economy',   120, 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Cebu Pacific',       '5J 501',  'Manila', 'Boracay',      '09:30', '10:40', '2026-09-16', 3800.00,  'Economy',   150, 'https://images.unsplash.com/photo-1540339832862-474599807a5e?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'PAL Express',         '2P 210',  'Manila', 'Puerto Princesa','11:00','12:30', '2026-09-17', 4600.00,  'Economy',   130, 'https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'ANA',                 'NH 818',  'Manila', 'Tokyo',         '20:15', '02:00', '2026-09-18', 28500.00, 'Economy',    90, 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Japan Airlines',      'JL 742',  'Manila', 'Osaka',         '13:30', '21:00', '2026-09-19', 31000.00, 'Economy',   110, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Singapore Airlines',  'SQ 921',  'Manila', 'Singapore',     '16:00', '19:45', '2026-09-20', 24000.00, 'Business',   45, 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Emirates',            'EK 335',  'Manila', 'Dubai',         '22:45', '04:30', '2026-09-21', 46000.00, 'Economy',   150, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'KLM',                 'KL 806',  'Manila', 'Amsterdam',     '01:30', '09:15', '2026-09-22', 58000.00, 'Economy',   160, 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Qantas',              'QF 20',   'Manila', 'Sydney',        '08:45', '19:30', '2026-09-23', 52000.00, 'Economy',   140, 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Delta',               'DL 440',  'Manila', 'New York',      '23:55', '11:00', '2026-09-24', 82000.00, 'Business',   40, 'https://images.unsplash.com/photo-1542103749-8ef59b94f47e?w=800&q=80', 'Active', NULL);

    PRINT '10 Flights inserted.';
END
ELSE
    PRINT 'Flights table already has data. Skipping insert.';
GO

-- Fix any previously-seeded flights to use unique images (harmless on fresh installs).
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80' WHERE [FlightNumber] = 'PR 102';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1540339832862-474599807a5e?w=800&q=80' WHERE [FlightNumber] = '5J 501';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1558389186-4386d1bea007?w=800&q=80' WHERE [FlightNumber] = '2P 210';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800&q=80' WHERE [FlightNumber] = 'NH 818';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80' WHERE [FlightNumber] = 'JL 742';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800&q=80' WHERE [FlightNumber] = 'SQ 921';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80' WHERE [FlightNumber] = 'EK 335';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80' WHERE [FlightNumber] = 'KL 806';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80' WHERE [FlightNumber] = 'QF 20';
UPDATE [Flights] SET [ImageUrl] = 'https://images.unsplash.com/photo-1542103749-8ef59b94f47e?w=800&q=80' WHERE [FlightNumber] = 'DL 440';
GO

-- ============================================
-- 2. HOTELS (10)
-- ============================================
IF NOT EXISTS (SELECT 1 FROM [Hotels])
BEGIN
    INSERT INTO [Hotels] ([CreatedAt],[UpdatedAt],[Name],[Location],[Description],[PricePerNight],[Rating],[Reviews],[Amenities],[ImageUrl],[Status],[RoomsAvailable],[SupplierId])
    VALUES
    (GETUTCDATE(), GETUTCDATE(), 'White Beach Resort Villas',  'Boracay',        'Beachfront villas minutes from the famous white sand shoreline.',          8500.00,  4.8, 312, 'Free Wi-Fi|Pool|Beachfront|Restaurant|Spa',                          'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', 'Active', 42,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Harbor Bay Grand',          'Palawan',        'Overwater bungalows with panoramic views of the limestone cliffs.',        12000.00, 4.9, 487, 'Pool|Spa|Diving|Free Wi-Fi|Bar',                                      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80', 'Active', 65,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Sakura Garden Hotel',       'Tokyo',          'Modern comfort in the heart of the city, steps from transit.',             9800.00,  4.6, 721, 'Free Wi-Fi|Gym|Restaurant|Concierge|Laundry',                         'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80', 'Active', 120, NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Kyoto Zen Retreat',         'Kyoto',          'Traditional ryokan with tatami rooms and a tranquil garden bath.',         11000.00, 4.9, 268, 'Onsen|Garden|Tea House|Breakfast|Free Wi-Fi',                         'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80', 'Active', 18,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Bali Cliffside Resort',    'Bali',           'Luxury villas perched over the Indian Ocean with infinity pools.',        14500.00, 4.7, 356, 'Infinity Pool|Spa|Restaurant|Yoga|Free Wi-Fi',                        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80', 'Active', 54,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Le Reve Paris',             'Paris',          'Elegant boutique hotel near the Champs-Elysees with classic French charm.',16800.00, 4.8, 540, 'Free Wi-Fi|Bar|Concierge|Room Service|Gym',                           'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80', 'Active', 38,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Aegean Blue Suites',       'Santorini',      'Cave suites with private plunge pools and caldera sunsets.',              19200.00, 5.0, 419, 'Plunge Pool|Breakfast|Airport Shuttle|Bar|Free Wi-Fi',                'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', 'Active', 27,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Skyline Tower Hotel',       'Dubai',          'Stay high above the city with panoramic views of the Burj Khalifa.',      13500.00, 4.7, 634, 'Infinity Pool|Gym|Restaurant|Spa|Free Wi-Fi',                         'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', 'Active', 88,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Lakeview Adventure Lodge',  'Queenstown',     'Charming lodge overlooking Lake Wakatipu near the ski fields.',           7200.00,  4.5, 302, 'Free Wi-Fi|Restaurant|Fireplace|Parking|Bar',                          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', 'Active', 31,  NULL),
    (GETUTCDATE(), GETUTCDATE(), 'The Manhattan Grand',       'New York',       'Iconic midtown hotel with skyline views and luxury amenities.',           21800.00, 4.6, 893, 'Gym|Bar|Concierge|Free Wi-Fi|Restaurant',                              'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80', 'Active', 150, NULL);

    PRINT '10 Hotels inserted.';
END
ELSE
    PRINT 'Hotels table already has data. Skipping.';
GO

-- ============================================
-- 3. CARS (10)
-- ============================================
IF NOT EXISTS (SELECT 1 FROM [Cars])
BEGIN
    INSERT INTO [Cars] ([CreatedAt],[UpdatedAt],[Name],[Type],[Location],[PricePerDay],[Transmission],[Seats],[FuelType],[ImageUrl],[Status],[SupplierId])
    VALUES
    (GETUTCDATE(), GETUTCDATE(), 'Toyota Vios',        'Sedan',  'Manila',           1900.00, 'Automatic', 5,  'Gasoline', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Honda Civic',        'Sedan',  'Cebu',             2200.00, 'Automatic', 5,  'Gasoline', 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Toyota Fortuner',    'SUV',    'Manila',           3500.00, 'Automatic', 7,  'Diesel',   'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Mitsubishi Montero', 'SUV',    'Davao',            3400.00, 'Automatic', 7,  'Diesel',   'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Nissan Almera',      'Sedan',  'Iloilo',           1700.00, 'Manual',    5,  'Gasoline', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Hyundai Stargazer',  'MPV',    'Manila',           3000.00, 'Automatic', 7,  'Gasoline', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Toyota Hilux',       'Pickup', 'Baguio',           3800.00, 'Manual',    5,  'Diesel',   'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Toyota Hiace',       'Van',    'Cebu',             4200.00, 'Manual',    14, 'Diesel',   'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Suzuki Jimny',       'SUV',    'Puerto Princesa',  2600.00, 'Manual',    4,  'Gasoline', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80', 'Active', NULL),
    (GETUTCDATE(), GETUTCDATE(), 'Hyundai Accent',     'Sedan',  'Manila',           1600.00, 'Automatic', 5,  'Gasoline', 'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800&q=80', 'Active', NULL);

    PRINT '10 Cars inserted.';
END
ELSE
    PRINT 'Cars table already has data. Skipping.';
GO

-- ============================================
-- 4. PACKAGES / DEALS (10)
--    Mix of: Flight+Hotel, Flight+Hotel+Car, etc.
-- ============================================
IF NOT EXISTS (SELECT 1 FROM [Packages])
BEGIN
    INSERT INTO [Packages] ([CreatedAt],[UpdatedAt],[Name],[Location],[Description],[Duration],[Price],[Rating],[Reviews],[Tag],[ImageUrl],[Status],[Itinerary],[Inclusions],[Exclusions],[SupplierId])
    VALUES
    -- Flight + Hotel only
    (GETUTCDATE(), GETUTCDATE(), 'Boracay Beach Escape',        'Boracay, Visayas',       '4 days of sun, sand, and island hopping around the Philippines top beach destination.', '4D / 3N', 15999.00, 4.8, 210, 'Best Seller', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80', 'Featured', 'Day 1: Arrival & White Beach|Day 2: Island Hopping|Day 3: Water Sports & Leisure|Day 4: Departure', '3 nights hotel|Daily breakfast|Airport transfers', 'Airfare|Meals not mentioned|Personal expenses', NULL),

    -- Flight + Hotel + Car
    (GETUTCDATE(), GETUTCDATE(), 'Palawan Explorer Bundle',     'Palawan, Visayas',       'Discover the UNESCO-listed subterranean river with a rental car for free exploration.',   '4D / 3N', 18500.00, 4.9, 175, 'TRENDING',   'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80', 'Active', 'Day 1: Arrival & Pick-up Car|Day 2: Underground River Drive|Day 3: Honda Bay Tour|Day 4: Departure', '3 nights hotel|Daily breakfast|Rental car (3 days)|Airport transfers', 'Airfare|Fuel|Parking fees|Meals', NULL),

    -- Flight + Hotel + Car
    (GETUTCDATE(), GETUTCDATE(), 'Tokyo City Lights',           'Tokyo, Japan',           'Explore neon districts, historic temples, and world-class dining in Japan capital.',       '5D / 4N', 32500.00, 4.7, 340, 'TRENDING',   'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80', 'Active', 'Day 1: Arrival|Day 2: Asakusa & Shibuya|Day 3: Mount Fuji Day Trip|Day 4: Shopping & Shinjuku|Day 5: Departure', '4 nights hotel|Daily breakfast|Mt. Fuji day tour|Airport transfers', 'Airfare|Meals|Travel insurance', NULL),

    -- Flight + Hotel only
    (GETUTCDATE(), GETUTCDATE(), 'Kyoto Cultural Immersion',    'Kyoto, Japan',           'Step back in time through temples, tea ceremonies, and geisha streets.',                    '4D / 3N', 28800.00, 4.9, 150, 'CULTURAL',   'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80', 'Active', 'Day 1: Arrival|Day 2: Golden Pavilion & Tea Ceremony|Day 3: Fushimi Inari & Gion|Day 4: Departure', '3 nights ryokan|Breakfast daily|Tea ceremony|Public transport pass', 'Airfare|Meals|Extras', NULL),

    -- Flight + Hotel + Car
    (GETUTCDATE(), GETUTCDATE(), 'Bali Honeymoon Paradise',     'Bali, Indonesia',        'Romantic island getaway with spa treatments, sunset dinners, and a private car for island tours.', '6D / 5N', 45800.00, 4.8, 264, 'ROMANTIC',   'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', 'Active', 'Day 1: Arrival & Pick-up Car|Day 2: Ubud Rice Terraces|Day 3: Spa & Beach Club|Day 4: Nusa Penida|Day 5: Sunset Cruise|Day 6: Departure', '5 nights resort|Daily breakfast|Romance package|Rental car (5 days)|Airport transfers', 'Airfare|Lunch & dinner|Optional tours|Fuel', NULL),

    -- Flight + Hotel only
    (GETUTCDATE(), GETUTCDATE(), 'Paris Art & Romance',         'Paris, France',          'The Eiffel Tower, Louvre, and Seine cruises wrapped in classic Parisian charm.',           '5D / 4N', 47800.00, 4.7, 198, 'LUXURY',     'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80', 'Active', 'Day 1: Arrival|Day 2: Louvre & Eiffel Tower|Day 3: Versailles|Day 4: Seine Cruise & Montmartre|Day 5: Departure', '4 nights hotel|Daily breakfast|Museum passes|Seine cruise', 'Airfare|Meals|Extras', NULL),

    -- Flight + Hotel only
    (GETUTCDATE(), GETUTCDATE(), 'Santorini Sunset Escape',     'Santorini, Greece',      'Whitewashed cliffs, caldera sunsets, and Aegean island magic.',                             '4D / 3N', 42900.00, 4.9, 178, 'ICONIC',     'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80', 'Active', 'Day 1: Arrival|Day 2: Oia & Fira|Day 3: Volcano & Hot Springs|Day 4: Departure', '3 nights cave hotel|Daily breakfast|Catamaran cruise', 'Airfare|Meals|Extras', NULL),

    -- Flight + Hotel + Car
    (GETUTCDATE(), GETUTCDATE(), 'Dubai Luxury Escape',         'Dubai, UAE',             'Desert safaris, Burj Khalifa views, premium city living, and a rental car for convenience.', '4D / 3N', 43500.00, 4.6, 221, 'LUXURY',     'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80', 'Active', 'Day 1: Arrival & Pick-up Car|Day 2: Burj Khalifa & City Tour|Day 3: Desert Safari|Day 4: Departure', '3 nights hotel|Daily breakfast|Desert safari|Rental car (3 days)|Airport transfers', 'Airfare|Fuel|Meals|Optional tours', NULL),

    -- Flight + Hotel + Car
    (GETUTCDATE(), GETUTCDATE(), 'Queenstown Adventure Week',   'Queenstown, New Zealand', 'Thrills, lakes, and landscapes with a rental car to explore the Southern Alps at your own pace.', '7D / 6N', 59200.00, 4.8, 143, 'ADVENTURE', 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80', 'Active', 'Day 1: Arrival & Pick-up Car|Day 2: Lake Cruise|Day 3: Bungy & Jet Boating|Day 4: Milford Sound|Day 5: Ski Day|Day 6: Freedom Day|Day 7: Departure', '6 nights lodge|Daily breakfast|Milford Sound tour|Adventure pass|Rental car (7 days)', 'Airfare|Meals|Gear rental|Fuel', NULL),

    -- Flight + Hotel + Car
    (GETUTCDATE(), GETUTCDATE(), 'New York City Break',         'New York, USA',          'Broadway, Central Park, and Manhattan with a rental car for upstate excursions.',            '5D / 4N', 52800.00, 4.6, 290, 'URBAN',      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80', 'Active', 'Day 1: Arrival & Pick-up Car|Day 2: Central Park & Times Square|Day 3: Statue of Liberty|Day 4: Broadway Show|Day 5: Departure', '4 nights hotel|Broadway ticket|Liberty cruise|City passes|Rental car (4 days)', 'Airfare|Meals|Extras|Fuel', NULL);

    PRINT '10 Packages inserted.';
END
ELSE
    PRINT 'Packages table already has data. Skipping.';
GO

-- ============================================
-- DONE
-- ============================================
PRINT '============================================';
PRINT ' Seeding complete! Ready for booking tests.';
PRINT ' Flights: 10  |  Hotels: 10  |  Cars: 10';
PRINT ' Packages/Deals: 10 (mix of Flight+Hotel, Flight+Hotel+Car)';
PRINT '============================================';
GO
