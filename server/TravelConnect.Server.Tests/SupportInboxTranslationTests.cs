using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Guards the defect class that made the Agency Support Hub unusable: a LINQ
/// predicate EF Core happily evaluates client-side under the in-memory provider
/// but cannot translate to SQL. Every unit test passed while
/// <c>GET /api/support/inbox</c> returned HTTP 500 in production, which the
/// client rendered as "An unexpected error occurred. / Refresh to try again.".
///
/// These tests use the controller's OWN predicate
/// (<see cref="SupportController.NotTierConversation"/>) and the REAL relational
/// providers, so nothing here re-implements the query and drifts from it.
/// </summary>
public class SupportInboxTranslationTests
{
    /// <summary>
    /// A SQL Server provider pointed at a dead host: <c>ToQueryString()</c>
    /// compiles the LINQ to T-SQL without ever opening a connection, so this
    /// proves translatability against the provider production actually uses.
    /// </summary>
    private static TravelConnectDbContext SqlServerContext()
    {
        var options = new DbContextOptionsBuilder<TravelConnectDbContext>()
            .UseSqlServer("Server=never-connects;Database=translation-probe;Trusted_Connection=True;")
            .Options;
        return new TravelConnectDbContext(options);
    }

    [Fact]
    public void Tier_filter_translates_to_sql_server()
    {
        using var db = SqlServerContext();

        // Throws "The LINQ expression ... could not be translated" if the
        // predicate is not server-expressible.
        var sql = db.SupportConversations
            .AsNoTracking()
            .Where(SupportController.NotTierConversation())
            .OrderByDescending(c => c.LastMessageAt)
            .Take(200)
            .ToQueryString();

        // The exclusion must be pushed down INTO the WHERE clause, and it must
        // be the case-insensitive form — a client-side check would have produced
        // no Category predicate here at all.
        Assert.Contains("WHERE", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Category", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("lower", sql, StringComparison.OrdinalIgnoreCase);
        Assert.True(
            sql.Contains("<>", StringComparison.Ordinal) || sql.Contains("!=", StringComparison.Ordinal),
            $"Tier filter did not compile to a SQL inequality:\n{sql}");
        Assert.Contains("subscription", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Tier_filter_also_translates_on_sqlite()
    {
        using var rel = TestDb.CreateRelational();

        var sql = rel.Db.SupportConversations
            .AsNoTracking()
            .Where(SupportController.NotTierConversation())
            .ToQueryString();

        Assert.Contains("WHERE", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Category", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Inbox_against_a_relational_provider_returns_only_customer_problems()
    {
        // The end-to-end version: a real SQL engine (SQLite in-memory) running
        // the actual Inbox() action as a real Agency Admin. Before the fix this
        // threw "The LINQ expression ... could not be translated".
        using var rel = TestDb.CreateRelational();
        var db = rel.Db;
        SeedUser(db, "ad", "admin@tc.com", "Agency Admin");
        SeedUser(db, "su", "super@tc.com", "Super Admin");
        SeedConversation(db, "a@tc.com", "General", "Refund request");
        SeedConversation(db, "b@tc.com", "Payment", "Charged twice");
        SeedConversation(db, "t@tc.com", "Subscription", "Which plan?");
        // A legacy row written with different casing must still count as tier —
        // the filter is case-insensitive on purpose, so the Super Admin's
        // category boundary cannot be dodged by a differently-cased row.
        SeedConversation(db, "u@tc.com", "subscription", "legacy casing");

        var agencyAdmin = new SupportController(db, TestDb.FakeEmailService())
            .WithIdentity("ad", "admin@tc.com");
        var superAdmin = new SupportController(db, TestDb.FakeEmailService())
            .WithIdentity("su", "super@tc.com");

        var problems = await agencyAdmin.Inbox();
        var list = Assert.IsAssignableFrom<List<SupportConversation>>(problems.Value);
        Assert.Equal(2, list.Count);
        Assert.DoesNotContain(list, c => string.Equals(c.Category, "subscription", StringComparison.OrdinalIgnoreCase));

        // The Super Admin's explicit tier inbox still resolves, so the fix did
        // not break the other half of the split.
        var tier = await superAdmin.Inbox(category: "Subscription");
        Assert.NotNull(tier.Value);
    }

    [Fact]
    public async Task Inbox_against_a_relational_provider_respects_status_and_assignee_filters()
    {
        using var rel = TestDb.CreateRelational();
        var db = rel.Db;
        SeedUser(db, "ad", "admin@tc.com", "Agency Admin");

        SeedConversation(db, "a@tc.com", "General", "open one", status: "Open");
        SeedConversation(db, "b@tc.com", "General", "replied one", status: "Replied");
        SeedConversation(db, "c@tc.com", "General", "mine", status: "Open", assignee: "admin@tc.com");

        var ctrl = new SupportController(db, TestDb.FakeEmailService())
            .WithIdentity("ad", "admin@tc.com");

        var open = await ctrl.Inbox(status: "Open");
        Assert.Equal(2, Assert.IsAssignableFrom<List<SupportConversation>>(open.Value).Count);

        var mine = await ctrl.Inbox(assignee: "admin@tc.com");
        var mineList = Assert.IsAssignableFrom<List<SupportConversation>>(mine.Value);
        Assert.Single(mineList);
        Assert.Equal("mine", mineList[0].LastMessagePreview);
    }

    [Fact]
    public async Task Inbox_against_a_relational_provider_pages_and_clamps()
    {
        using var rel = TestDb.CreateRelational();
        var db = rel.Db;
        SeedUser(db, "ad", "admin@tc.com", "Agency Admin");
        for (var i = 0; i < 5; i++) SeedConversation(db, $"c{i}@tc.com", "General", $"m{i}");

        var ctrl = new SupportController(db, TestDb.FakeEmailService())
            .WithIdentity("ad", "admin@tc.com");

        var one = await ctrl.Inbox(page: 1, pageSize: 1);
        Assert.Single(Assert.IsAssignableFrom<List<SupportConversation>>(one.Value));

        var second = await ctrl.Inbox(page: 2, pageSize: 1);
        Assert.Single(Assert.IsAssignableFrom<List<SupportConversation>>(second.Value));

        // An absurd page size is still clamped, so the hub can never ask the
        // database for an unbounded list.
        var capped = await ctrl.Inbox(pageSize: 9000);
        Assert.Equal(5, Assert.IsAssignableFrom<List<SupportConversation>>(capped.Value).Count);
    }

    private static void SeedUser(TravelConnectDbContext db, string uid, string email, string role)
    {
        db.SystemUsers.Add(new SystemUser
        {
            FirebaseUid = uid,
            Email = email,
            DisplayName = role.Replace(" ", string.Empty),
            Role = role,
            Status = "Active"
        });
        db.SaveChanges();
    }

    private static void SeedConversation(
        TravelConnectDbContext db,
        string email,
        string category,
        string preview,
        string status = "Open",
        string assignee = "")
    {
        db.SupportConversations.Add(new SupportConversation
        {
            CustomerEmail = email,
            CustomerName = "Customer",
            Subject = preview,
            Category = category,
            Status = status,
            AssigneeEmail = assignee,
            UnreadByAgent = 1,
            UnreadByCustomer = 0,
            LastMessageAt = DateTime.UtcNow,
            LastMessagePreview = preview,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
    }
}
