using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;

namespace TravelConnect.Server.Extensions;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TravelConnectDbContext>();

        // Create database if it doesn't exist
        await db.Database.EnsureCreatedAsync();

        // Seed initial data if empty
        await SeedAsync(db);
    }

    private static async Task SeedAsync(TravelConnectDbContext db)
    {
        if (await db.Customers.AnyAsync() || await db.Suppliers.AnyAsync()) return;

        var customers = new[]
        {
            new Models.Customer { Name = "Maria Santos", Email = "maria@gmail.com", Phone = "+63 917 123 4567", Country = "Philippines", TotalBookings = 4, TotalSpent = 74900m, Status = "Active" },
            new Models.Customer { Name = "Priya Nair", Email = "priya@gmail.com", Phone = "+91 982 345 6789", Country = "India", TotalBookings = 2, TotalSpent = 34800m, Status = "Active" },
            new Models.Customer { Name = "James Tan", Email = "james@gmail.com", Phone = "+65 9123 4567", Country = "Singapore", TotalBookings = 1, TotalSpent = 12900m, Status = "Inactive" },
            new Models.Customer { Name = "Sarah Chen", Email = "sarah@gmail.com", Phone = "+1 555 123 4567", Country = "USA", TotalBookings = 6, TotalSpent = 124800m, Status = "Active" },
            new Models.Customer { Name = "Aiko Yamada", Email = "aiko@gmail.com", Phone = "+81 90 1234 5678", Country = "Japan", TotalBookings = 2, TotalSpent = 45900m, Status = "Active" },
            new Models.Customer { Name = "Marcus Okoye", Email = "marcus@gmail.com", Phone = "+234 803 123 4567", Country = "Nigeria", TotalBookings = 3, TotalSpent = 67500m, Status = "Active" },
            new Models.Customer { Name = "Lena Muller", Email = "lena@gmail.com", Phone = "+49 171 123 4567", Country = "Germany", TotalBookings = 1, TotalSpent = 21900m, Status = "Pending" },
        };

        var suppliers = new[]
        {
            new Models.Supplier { CompanyName = "Bali Paradise Resorts", ContactName = "I Wayan Agung", ContactEmail = "wayan@baliparadise.com", ContactPhone = "+62 812 345 6789", Type = "Hotel", Rating = 4.8m, Status = "Active" },
            new Models.Supplier { CompanyName = "Tokyo Transfers Co.", ContactName = "Hiroshi Tanaka", ContactEmail = "hiroshi@tokyotransfers.com", ContactPhone = "+81 3 1234 5678", Type = "Transport", Rating = 4.7m, Status = "Active" },
            new Models.Supplier { CompanyName = "Aegean Tours Ltd.", ContactName = "Nikos Pappas", ContactEmail = "nikos@aegeantours.com", ContactPhone = "+30 21 1234 5678", Type = "Tour Operator", Rating = 4.9m, Status = "Active" },
            new Models.Supplier { CompanyName = "Alps Adventure Co.", ContactName = "Hans Gruber", ContactEmail = "hans@alpsadventure.com", ContactPhone = "+41 79 123 4567", Type = "Activity", Rating = 4.5m, Status = "Review" },
            new Models.Supplier { CompanyName = "Manila Air Services", ContactName = "Juan Dela Cruz", ContactEmail = "juan@manilaair.com", ContactPhone = "+63 2 8123 4567", Type = "Airline", Rating = 4.6m, Status = "Active" },
            new Models.Supplier { CompanyName = "Singapore Luxury Hotels", ContactName = "Wei Lin", ContactEmail = "wei@singaporeluxury.com", ContactPhone = "+65 6789 1234", Type = "Hotel", Rating = 4.9m, Status = "Active" },
        };

        db.Customers.AddRange(customers);
        db.Suppliers.AddRange(suppliers);
        await db.SaveChangesAsync();

        var packages = new[]
        {
            new Models.Package { Name = "Bali Serenity Escape", Location = "Indonesia", Description = "Seven days of beaches, temples and tranquility in Bali.", Duration = "7D", Price = 74900m, Rating = 4.8m, Reviews = 312, Tag = "Best Seller", Status = "Active", SupplierId = suppliers[0].Id },
            new Models.Package { Name = "Paris Romance Package", Location = "France", Description = "Five romantic days in the City of Light.", Duration = "5D", Price = 107500m, Rating = 4.9m, Reviews = 487, Tag = "Top Rated", Status = "Active", SupplierId = suppliers[2].Id },
            new Models.Package { Name = "Tokyo Cultural Immersion", Location = "Japan", Description = "Ten days experiencing Japan's rich culture and cuisine.", Duration = "10D", Price = 142500m, Rating = 4.7m, Reviews = 256, Tag = "Cultural", Status = "Active", SupplierId = suppliers[1].Id },
            new Models.Package { Name = "Maldives Overwater Villa", Location = "Maldives", Description = "Eight-day luxury escape in an overwater villa.", Duration = "8D", Price = 186000m, Rating = 5.0m, Reviews = 189, Tag = "Luxury", Status = "Active", SupplierId = suppliers[0].Id },
            new Models.Package { Name = "Swiss Alps Adventure", Location = "Switzerland", Description = "Twelve days of mountain hikes, cable cars and alpine views.", Duration = "12D", Price = 219000m, Rating = 4.6m, Reviews = 142, Tag = "Ultra-Luxury", Status = "Active", SupplierId = suppliers[3].Id },
            new Models.Package { Name = "New York City Break", Location = "USA", Description = "Four-day city break in the Big Apple.", Duration = "4D", Price = 89900m, Rating = 4.5m, Reviews = 198, Tag = "City Break", Status = "Active", SupplierId = suppliers[5].Id },
        };

        var destinations = new[]
        {
            new Models.Destination { Name = "Bali, Indonesia", Region = "Southeast Asia", Category = "Beach & Culture", Status = "Featured" },
            new Models.Destination { Name = "Santorini, Greece", Region = "Europe", Category = "Romance", Status = "Featured" },
            new Models.Destination { Name = "Tokyo, Japan", Region = "East Asia", Category = "Culture & Food", Status = "Featured" },
            new Models.Destination { Name = "Maldives", Region = "Indian Ocean", Category = "Luxury", Status = "Featured" },
            new Models.Destination { Name = "Paris, France", Region = "Europe", Category = "Romance", Status = "Active" },
            new Models.Destination { Name = "Swiss Alps", Region = "Europe", Category = "Adventure", Status = "Active" },
            new Models.Destination { Name = "New York, USA", Region = "Americas", Category = "City Break", Status = "Active" },
        };

        var flights = new[]
        {
            new Models.Flight { Airline = "Philippine Airlines", FlightNumber = "PR180", DepartureCity = "Manila", ArrivalCity = "Bali", DepartureTime = "09:00", ArrivalTime = "12:30", DepartureDate = "2026-09-15", Price = 12800m, Class = "Economy", SeatsAvailable = 24, Status = "Active", SupplierId = suppliers[4].Id },
            new Models.Flight { Airline = "Japan Airlines", FlightNumber = "JL724", DepartureCity = "Manila", ArrivalCity = "Tokyo", DepartureTime = "06:45", ArrivalTime = "12:20", DepartureDate = "2026-09-18", Price = 15600m, Class = "Economy", SeatsAvailable = 18, Status = "Active", SupplierId = suppliers[4].Id },
            new Models.Flight { Airline = "Singapore Airlines", FlightNumber = "SQ891", DepartureCity = "Manila", ArrivalCity = "Singapore", DepartureTime = "18:30", ArrivalTime = "21:45", DepartureDate = "2026-09-20", Price = 9800m, Class = "Economy", SeatsAvailable = 32, Status = "Active", SupplierId = suppliers[4].Id },
        };

        var hotels = new[]
        {
            new Models.Hotel { Name = "Ayana Resort Bali", Location = "Bali, Indonesia", Description = "Clifftop luxury resort with ocean views.", PricePerNight = 12500m, Rating = 4.9m, Reviews = 1500, Status = "Active", RoomsAvailable = 42, SupplierId = suppliers[0].Id },
            new Models.Hotel { Name = "Le Meurice Paris", Location = "Paris, France", Description = "Palace hotel steps from the Louvre.", PricePerNight = 18500m, Rating = 4.8m, Reviews = 900, Status = "Active", RoomsAvailable = 12, SupplierId = suppliers[2].Id },
            new Models.Hotel { Name = "Marina Bay Sands", Location = "Singapore", Description = "Iconic infinity pool overlooking the bay.", PricePerNight = 22000m, Rating = 4.7m, Reviews = 3200, Status = "Active", RoomsAvailable = 28, SupplierId = suppliers[5].Id },
        };

        var cars = new[]
        {
            new Models.Car { Name = "Toyota Vios", Type = "Sedan", Location = "Manila", PricePerDay = 2800m, Transmission = "Automatic", Seats = 5, FuelType = "Gasoline", Status = "Active", SupplierId = suppliers[1].Id },
            new Models.Car { Name = "Honda CR-V", Type = "SUV", Location = "Manila", PricePerDay = 4200m, Transmission = "Automatic", Seats = 7, FuelType = "Gasoline", Status = "Active", SupplierId = suppliers[1].Id },
            new Models.Car { Name = "Toyota Hiace", Type = "Van", Location = "Cebu", PricePerDay = 5500m, Transmission = "Manual", Seats = 12, FuelType = "Diesel", Status = "Active", SupplierId = suppliers[1].Id },
        };

        var activities = new[]
        {
            new Models.Activity { Name = "Boracay Island Hopping", Location = "Boracay", Description = "Explore crystal-clear waters and white sand beaches.", Price = 3500m, Duration = "6 hours", Rating = 4.8m, Reviews = 420, Status = "Active", SupplierId = suppliers[3].Id },
            new Models.Activity { Name = "Taal Volcano Trek", Location = "Batangas", Description = "Hike to the crater of an active volcano.", Price = 2500m, Duration = "5 hours", Rating = 4.6m, Reviews = 310, Status = "Active", SupplierId = suppliers[3].Id },
            new Models.Activity { Name = "Cebu Canyoneering", Location = "Cebu", Description = "Canyon jump and swim through turquoise pools.", Price = 2800m, Duration = "7 hours", Rating = 4.9m, Reviews = 540, Status = "Active", SupplierId = suppliers[3].Id },
        };

        var promotions = new[]
        {
            new Models.Promotion { Code = "SUMMER26", CampaignName = "Summer Sale 2026", Discount = 20m, DiscountType = "Percent", MaxUses = 500, UsedCount = 142, ExpiresAt = "2026-08-31", Status = "Active" },
            new Models.Promotion { Code = "WELCOME50", CampaignName = "New Member Discount", Discount = 2900m, DiscountType = "Fixed", MaxUses = 1000, UsedCount = 89, ExpiresAt = "2026-12-31", Status = "Active" },
            new Models.Promotion { Code = "BALI15", CampaignName = "Bali Special Offer", Discount = 15m, DiscountType = "Percent", MaxUses = 100, UsedCount = 37, ExpiresAt = "2026-09-15", Status = "Active" },
        };

        var leads = new[]
        {
            new Models.Lead { Name = "Carlos Reyes", Email = "carlos@email.com", Phone = "+63 912 345 6789", Interest = "Bali Package", Stage = "Qualified", AssignedTo = "Jordan Lee", LastContact = "2026-08-10" },
            new Models.Lead { Name = "Yuki Sato", Email = "yuki@email.com", Phone = "+81 90 3456 7890", Interest = "Japan Tours", Stage = "Proposal", AssignedTo = "Jordan Lee", LastContact = "2026-08-12" },
            new Models.Lead { Name = "Emma Wilson", Email = "emma@email.com", Phone = "+44 7700 123 456", Interest = "Maldives Retreat", Stage = "New", AssignedTo = "Alex Rivera", LastContact = "2026-08-14" },
        };

        var inquiries = new[]
        {
            new Models.Inquiry { CustomerName = "Maria Santos", CustomerEmail = "maria@gmail.com", Subject = "Flight booking change", Category = "Flight", Message = "Can I change my connecting flight?", Status = "Replied", Reply = "Yes, please provide your booking reference." },
            new Models.Inquiry { CustomerName = "James Tan", CustomerEmail = "james@gmail.com", Subject = "Payment not processed", Category = "Payment", Message = "My card was charged but booking not confirmed.", Status = "Pending" },
            new Models.Inquiry { CustomerName = "Sarah Chen", CustomerEmail = "sarah@gmail.com", Subject = "Hotel upgrade available?", Category = "Hotel", Message = "Is there an upgrade option for Ayana Resort?", Status = "Pending" },
        };

        var bookings = new[]
        {
            new Models.Booking { ReferenceNumber = "TC-BK-0047", CustomerName = "Maria Santos", CustomerEmail = "maria@gmail.com", CustomerPhone = "+63 917 123 4567", PackageId = 1, PackageName = "Bali Serenity Escape", Location = "Bali, Indonesia", StartDate = "2026-09-15", EndDate = "2026-09-22", Travellers = 2, Subtotal = 149800m, TotalAmount = 149800m, Status = "Upcoming", Paid = true, PaymentMethod = "Card" },
            new Models.Booking { ReferenceNumber = "TC-BK-0031", CustomerName = "James Tan", CustomerEmail = "james@gmail.com", CustomerPhone = "+65 9123 4567", PackageId = 2, PackageName = "Paris Romance Package", Location = "Paris, France", StartDate = "2026-03-10", EndDate = "2026-03-15", Travellers = 2, Subtotal = 215000m, TotalAmount = 215000m, Status = "Completed", Paid = true, PaymentMethod = "PayPal" },
            new Models.Booking { ReferenceNumber = "TC-BK-0019", CustomerName = "Priya Nair", CustomerEmail = "priya@gmail.com", CustomerPhone = "+91 982 345 6789", PackageId = 3, PackageName = "Tokyo Cultural Immersion", Location = "Tokyo, Japan", StartDate = "2025-11-05", EndDate = "2025-11-15", Travellers = 1, Subtotal = 142500m, TotalAmount = 142500m, Status = "Completed", Paid = true, PaymentMethod = "Card" },
            new Models.Booking { ReferenceNumber = "TC-BK-0055", CustomerName = "Sarah Chen", CustomerEmail = "sarah@gmail.com", CustomerPhone = "+1 555 123 4567", PackageId = 4, PackageName = "Maldives Overwater Villa", Location = "Maldives", StartDate = "2025-12-20", EndDate = "2025-12-28", Travellers = 2, Subtotal = 372000m, TotalAmount = 372000m, Status = "Cancelled", Paid = false, PaymentMethod = "Bank" },
        };

        db.Packages.AddRange(packages);
        db.Destinations.AddRange(destinations);
        db.Flights.AddRange(flights);
        db.Hotels.AddRange(hotels);
        db.Cars.AddRange(cars);
        db.Activities.AddRange(activities);
        db.Promotions.AddRange(promotions);
        db.Leads.AddRange(leads);
        db.Inquiries.AddRange(inquiries);
        db.Bookings.AddRange(bookings);
        await db.SaveChangesAsync();

        var payments = new[]
        {
            new Models.Payment { ReferenceId = "PAY-001", BookingId = bookings[0].Id, CustomerName = "Maria Santos", PackageName = "Bali Serenity Escape", Amount = 74900m, Method = "Card", Status = "Paid", PaymentDate = "2026-07-01" },
            new Models.Payment { ReferenceId = "PAY-002", BookingId = bookings[1].Id, CustomerName = "Marcus Okoye", PackageName = "Paris Romance Package", Amount = 107500m, Method = "PayPal", Status = "Paid", PaymentDate = "2026-07-03" },
            new Models.Payment { ReferenceId = "PAY-003", BookingId = bookings[2].Id, CustomerName = "Priya Nair", PackageName = "Tokyo Cultural Immersion", Amount = 142500m, Method = "Card", Status = "Partial", PaymentDate = "2026-07-05" },
        };

        var systemUsers = new[]
        {
            new Models.SystemUser { FirebaseUid = "", Email = "superadmin@travelconnect.com", DisplayName = "Juan Dela Cruz", Phone = "+63 917 123 4567", Role = "Super Admin", Department = "Administration", Status = "Active" },
            new Models.SystemUser { FirebaseUid = "", Email = "admin@travelconnect.com", DisplayName = "Maria Santos", Phone = "+63 918 234 5678", Role = "Agency Staff", Department = "Operations", Status = "Active" },
            new Models.SystemUser { FirebaseUid = "", Email = "finance@travelconnect.com", DisplayName = "Pedro Reyes", Phone = "+63 919 345 6789", Role = "Finance Staff", Department = "Finance", Status = "Active" },
            new Models.SystemUser { FirebaseUid = "", Email = "supplier@travelconnect.com", DisplayName = "Ana Garcia", Phone = "+63 920 456 7890", Role = "Supplier", Department = "Supply Chain", Status = "Active" },
        };

        db.Payments.AddRange(payments);
        db.SystemUsers.AddRange(systemUsers);
        await db.SaveChangesAsync();
    }
}