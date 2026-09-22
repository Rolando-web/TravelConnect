using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TravelConnect.Server.Data;
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