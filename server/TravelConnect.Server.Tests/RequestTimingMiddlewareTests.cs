using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TravelConnect.Server.Middleware;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Phase 13 — request-timing middleware. Proves every request is timed end-to-end
/// (even under an exception), slow requests surface as warnings, and responses
/// carry X-Elapsed-Ms + X-Request-Id. The headers are verified through an
/// in-process TestServer so the OnStarting path (where Kestrel actually sends
/// them) is exercised; the logging behavior is asserted at the unit level.
/// </summary>
public class RequestTimingMiddlewareTests
{
    private sealed class RecordingLogger : ILogger<RequestTimingMiddleware>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, formatter(state, exception)));
    }

    private static RequestTimingMiddleware Build(RecordingLogger logger, int slowThresholdMs)
    {
        return new RequestTimingMiddleware(
            static _ => Task.CompletedTask,
            logger,
            Options.Create(new RequestTimingOptions { SlowThresholdMs = slowThresholdMs }));
    }

    [Fact]
    public async Task Response_CarriesTimingHeaders_ThroughOnStarting()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseTestServer();
        await using var app = builder.Build();
        app.UseRequestTiming();
        app.MapGet("/api/test", () => Results.Ok(new { status = "ok" }));
        await app.StartAsync();

        var client = app.GetTestClient();
        var res = await client.GetAsync("/api/test");

        Assert.Equal(200, (int)res.StatusCode);
        Assert.True(res.Headers.Contains("X-Elapsed-Ms"));
        Assert.True(res.Headers.Contains("X-Request-Id"));
    }

    [Fact]
    public async Task FastRequest_LogsInfo()
    {
        var logger = new RecordingLogger();
        var ctx = new DefaultHttpContext { Request = { Method = "GET", Path = "/api/test" } };
        ctx.Response.StatusCode = 200;
        var mw = Build(logger, slowThresholdMs: 1000);

        await mw.InvokeAsync(ctx);

        var info = Assert.Single(logger.Entries, e => e.Level == LogLevel.Information);
        Assert.Contains("/api/test", info.Message);
        Assert.Contains("[Timing]", info.Message);
    }

    [Fact]
    public async Task SlowRequest_LogsWarning()
    {
        var logger = new RecordingLogger();
        var ctx = new DefaultHttpContext { Request = { Method = "GET", Path = "/api/test" } };
        ctx.Response.StatusCode = 200;
        // Threshold 0 => every request counts as slow, deterministically.
        var mw = Build(logger, slowThresholdMs: 0);

        await mw.InvokeAsync(ctx);

        var warning = Assert.Single(logger.Entries, e => e.Level == LogLevel.Warning);
        Assert.Contains("SLOW request", warning.Message);
    }

    [Fact]
    public async Task ThrowWithinPipeline_StillLogsTiming()
    {
        var logger = new RecordingLogger();
        var ctx = new DefaultHttpContext { Request = { Method = "GET", Path = "/api/boom" } };
        ctx.Response.StatusCode = 500;
        var mw = new RequestTimingMiddleware(
            static _ => throw new InvalidOperationException("boom"),
            logger,
            Options.Create(new RequestTimingOptions()));

        await Assert.ThrowsAsync<InvalidOperationException>(() => mw.InvokeAsync(ctx));

        var entry = Assert.Single(logger.Entries, e => e.Message.Contains("/api/boom"));
        Assert.Contains("500", entry.Message);
    }
}