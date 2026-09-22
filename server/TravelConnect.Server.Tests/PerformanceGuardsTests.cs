using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Phase 4 / 5 performance guards. These prove the production-speed
/// optimizations are enforced server-side:
///  - list endpoints are hard-capped to 500 rows (never unbounded)
///  - hot public endpoints are response-cached
///  - anonymous read search endpoints are rate-limited
/// </summary>
public class PerformanceGuardsTests
{
    private const int Cap = 500;

    private static async Task Seed<T>(TravelConnectDbContext db, int count, Func<int, T> factory) where T : class
    {
        for (var i = 0; i < count; i++)
        {
            var e = factory(i);
            var entry = db.Entry(e);
            entry.State = EntityState.Added;
        }
        await db.SaveChangesAsync();
    }

    private static Booking Booking(int i) => new()
    {
        ReferenceNumber = $"REF-{i:0000}",
        CustomerName = $"Customer {i}",
        CustomerEmail = $"c{i}@tc.com",
        Status = "confirmed",
        CreatedAt = DateTime.UtcNow.AddSeconds(-i),
        UpdatedAt = DateTime.UtcNow
    };

    private static Inquiry Inquiry(int i) => new()
    {
        CustomerName = $"Customer {i}",
        CustomerEmail = $"c{i}@tc.com",
        Subject = $"Subject {i}",
        Category = "Flight",
        Message = $"Message {i}",
        Status = "Pending",
        Reply = string.Empty,
        CreatedAt = DateTime.UtcNow.AddSeconds(-i),
        UpdatedAt = DateTime.UtcNow
    };

    private static Payment Payment(int i) => new()
    {
        ReferenceId = $"PAY-{i:0000}",
        Method = "gcash",
        Status = "pending",
        CreatedAt = DateTime.UtcNow.AddSeconds(-i),
        UpdatedAt = DateTime.UtcNow
    };

    private static SupportConversation Conversation(int i) => new()
    {
        CustomerEmail = $"c{i}@tc.com",
        CustomerName = $"Customer {i}",
        Subject = $"Subject {i}",
        Category = "General",
        Status = "Open",
        AssigneeEmail = string.Empty,
        UnreadByAgent = 1,
        UnreadByCustomer = 0,
        LastMessageAt = DateTime.UtcNow,
        LastMessagePreview = $"Message {i}",
        CreatedAt = DateTime.UtcNow.AddSeconds(-i),
        UpdatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task Bookings_GetAll_hard_caps_page_size_at_500()
    {
        using var db = TestDb.Create();
        await Seed(db, 520, Booking);

        var controller = new BookingsController(
            db, null!, null!, new CancellationService(), new PromoService(db),
            NullLogger<BookingsController>.Instance)
            .WithIdentity("u", "super@tc.com");

        var result = await controller.GetAll(page: 1, pageSize: 9000);
        var items = Assert.IsAssignableFrom<IEnumerable<Booking>>(result.Value);
        Assert.Equal(Cap, items.Count());
    }

    [Fact]
    public async Task Inquiries_GetAll_hard_caps_page_size_at_500()
    {
        using var db = TestDb.Create();
        await Seed(db, 520, Inquiry);

        var controller = new InquiriesController(db, TestDb.FakeEmailJsService(), TestDb.FakeEmailService())
            .WithIdentity("u", "super@tc.com");

        var result = await controller.GetAll(pageSize: 9000);
        var items = Assert.IsAssignableFrom<IEnumerable<Inquiry>>(result.Value);
        Assert.Equal(Cap, items.Count());
    }

    [Fact]
    public async Task Payments_GetAll_hard_caps_page_size_at_500()
    {
        using var db = TestDb.Create();
        await Seed(db, 520, Payment);

        var controller = new PaymentsController(db, null!, null!)
            .WithIdentity("u", "super@tc.com");

        var result = await controller.GetAll(page: 1, pageSize: 9000);
        var items = Assert.IsAssignableFrom<IEnumerable<Payment>>(result.Value);
        Assert.Equal(Cap, items.Count());
    }

    [Fact]
    public async Task Support_Inbox_hard_caps_page_size_at_500()
    {
        using var db = TestDb.Create();
        await Seed(db, 520, Conversation);
        db.SystemUsers.Add(new SystemUser { FirebaseUid = "st", Email = "staff@tc.com", DisplayName = "Staff", Role = "Agency Staff", Status = "Active" });
        await db.SaveChangesAsync();

        var controller = new SupportController(db, TestDb.FakeEmailService())
            .WithIdentity("st", "staff@tc.com");

        var result = await controller.Inbox(category: "All", page: 1, pageSize: 9000);
        var items = Assert.IsAssignableFrom<IEnumerable<SupportConversation>>(result.Value);
        Assert.Equal(Cap, items.Count());
    }

    [Fact]
    public void Dashboard_PublicStats_is_response_cached()
    {
        var attr = Method<DashboardController>("PublicStats").GetCustomAttribute<ResponseCacheAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(60, attr!.Duration);
    }

    [Fact]
    public void FeaturedPackages_and_Destinations_are_response_cached()
    {
        var featured = Method<PackagesController>("GetFeatured").GetCustomAttribute<ResponseCacheAttribute>();
        Assert.NotNull(featured);
        Assert.Equal(120, featured!.Duration);

        var destinations = Method<DestinationsController>("GetAll").GetCustomAttribute<ResponseCacheAttribute>();
        Assert.NotNull(destinations);
        Assert.Equal(300, destinations!.Duration);
    }

    [Fact]
    public void PublicRead_search_endpoints_are_rate_limited()
    {
        var location = Method<PackagesController>("GetByLocation")
            .GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(location);
        Assert.Equal("public-read", location!.PolicyName);

        var tag = Method<PackagesController>("GetByTag")
            .GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(tag);
        Assert.Equal("public-read", tag!.PolicyName);
    }

    [Fact]
    public void HotIndex_Tables_have_covering_indexes_registered()
    {
        using var db = TestDb.Create();
        var entityTypes = db.Model.GetEntityTypes().ToList();
        bool HasIndex(string entity, params string[] props) =>
            entityTypes.Single(e => e.ClrType.Name == entity)
                .GetIndexes()
                .Any(ix => props.All(p => ix.Properties.Select(pr => pr.Name).Contains(p)));

        Assert.True(HasIndex(nameof(Inquiry), "CustomerEmail"));
        Assert.True(HasIndex(nameof(Inquiry), "Category", "Status"));
        Assert.True(HasIndex(nameof(SupportConversation), "Status", "Category"));
        Assert.True(HasIndex(nameof(SupportConversation), "AssigneeEmail", "Status"));
        Assert.True(HasIndex(nameof(Booking), "ReferenceNumber"));
        Assert.True(HasIndex(nameof(Booking), "CustomerEmail", "Status"));
        Assert.True(HasIndex(nameof(Payment), "ReferenceId"));
        Assert.True(HasIndex(nameof(Payment), "Status", "Method"));
        Assert.True(HasIndex(nameof(EmailLog), "Type", "SentAt"));
        Assert.True(HasIndex(nameof(SupportMessage), "SupportConversationId", "CreatedAt"));
    }

    private static MethodInfo Method<TController>(string name) where TController : ControllerBase =>
        typeof(TController).GetMethod(name)
        ?? throw new InvalidOperationException($"Method {name} not found on {typeof(TController).Name}");
}