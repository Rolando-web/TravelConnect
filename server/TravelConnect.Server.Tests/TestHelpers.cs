using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Builds isolated in-memory contexts/controllers for unit tests.
/// Email services are constructed with EMPTY options so the SMTP/HTTP
/// paths short-circuit (return false) and never touch the network.
/// </summary>
public static class TestDb
{
    public static TravelConnectDbContext Create()
    {
        var options = new DbContextOptionsBuilder<TravelConnectDbContext>()
            .UseInMemoryDatabase($"tc-test-{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new TravelConnectDbContext(options);
    }

    /// <summary>
    /// A real relational context (SQLite in-memory) for the tests that assert
    /// database-level guarantees: foreign keys, CHECK constraints, filtered
    /// unique indexes and transaction rollback. The in-memory provider silently
    /// ignores all of them, so it cannot prove "invalid data is rejected".
    /// </summary>
    public static RelationalTestDb CreateRelational()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<TravelConnectDbContext>()
            .UseSqlite(connection)
            .ReplaceService<IModelCacheKeyFactory, ProviderAwareModelCacheKeyFactory>()
            .Options;
        var db = new TravelConnectDbContext(options);
        db.Database.EnsureCreated();
        return new RelationalTestDb(db, connection);
    }

    public static EmailService FakeEmailService() =>
        new(Options.Create(new EmailOptions()), new ServiceCollection().BuildServiceProvider());

    public static EmailJsService FakeEmailJsService() =>
        new(Options.Create(new EmailJsOptions()), new HttpClient());

    /// <summary>
    /// Serializes an anonymous/object result so internal anonymous types
    /// from the Server assembly can be asserted from the test assembly.
    /// </summary>
    public static JsonElement ToJson(object? value) =>
        JsonSerializer.SerializeToElement(value);
}

/// <summary>Owns both the context and the connection that keeps the SQLite
/// in-memory database alive for the lifetime of the test.</summary>
public sealed class RelationalTestDb(TravelConnectDbContext db, SqliteConnection connection) : IDisposable
{
    public TravelConnectDbContext Db { get; } = db;

    public void Dispose()
    {
        Db.Dispose();
        connection.Dispose();
    }
}

/// <summary>
/// The default model cache key is the context type alone, so the first model
/// built in the test process (in-memory, with SQL-Server-flavoured column
/// types) would be handed to the SQLite contexts too — and SQLite cannot
/// parse "nvarchar(max)". Keying on the provider as well gives each provider
/// its own model.
/// </summary>
public sealed class ProviderAwareModelCacheKeyFactory : IModelCacheKeyFactory
{
    public object Create(DbContext context, bool designTime) =>
        (context.GetType().FullName, context.Database.ProviderName, designTime);
}

public static class ControllerHarness
{
    private static ClaimsPrincipal Principal(string? uid, string? email) =>
        new(new ClaimsIdentity(
            new[]
            {
                new Claim("uid", uid ?? string.Empty),
                new Claim("email", email ?? string.Empty)
            },
            "test-auth"));

    /// <summary>Attaches a fake Firebase identity so CurrentUid()/CurrentEmail() resolve.</summary>
    public static T WithIdentity<T>(this T controller, string? uid, string? email) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = Principal(uid, email)
            }
        };
        return controller;
    }
}