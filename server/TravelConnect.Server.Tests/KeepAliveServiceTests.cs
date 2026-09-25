using System.Net;
using System.Net.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Phase 13 — App-Pool keep-alive. Proves the service pings the configured
/// health endpoint, flags slow/cold-start pings as warnings, swallows network
/// errors, and disables cleanly when no TargetUrl is configured.
/// </summary>
public class KeepAliveServiceTests
{
    private sealed class FakeLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, formatter(state, exception)));
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _respond;
        public StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> respond) => _respond = respond;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            _respond(request);
    }

    private sealed class FakeFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;
        public FakeFactory(HttpClient client) => _client = client;
        public HttpClient CreateClient(string name) => _client;
    }

    private static KeepAliveService Build(
        FakeLogger<KeepAliveService> logger,
        string? targetUrl,
        int slowThresholdMs = 5000,
        HttpMessageHandler? handler = null)
    {
        handler ??= new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        var client = new HttpClient(handler);
        var options = Options.Create(new KeepAliveOptions
        {
            TargetUrl = targetUrl,
            IntervalMinutes = 5,
            SlowThresholdMs = slowThresholdMs,
        });
        return new KeepAliveService(new FakeFactory(client), options, logger);
    }

    [Fact]
    public async Task PingOnceAsync_ReturnsTrueAndLogsInfoOn200()
    {
        var logger = new FakeLogger<KeepAliveService>();
        var svc = Build(logger, "https://tc.example/api/test");

        var ok = await svc.PingOnceAsync();

        Assert.True(ok);
        var info = Assert.Single(logger.Entries, e => e.Level == LogLevel.Information);
        Assert.Contains("https://tc.example/api/test", info.Message);
        Assert.Contains("[KeepAlive]", info.Message);
    }

    [Fact]
    public async Task PingOnceAsync_LogsSlowWhenColdTail()
    {
        var logger = new FakeLogger<KeepAliveService>();
        // Threshold 0 => the ping is treated as a cold-start response every time.
        var svc = Build(logger, "https://tc.example/api/test", slowThresholdMs: 0);

        await svc.PingOnceAsync();

        var warning = Assert.Single(logger.Entries, e => e.Level == LogLevel.Warning);
        Assert.Contains("cold start", warning.Message);
    }

    [Fact]
    public async Task PingOnceAsync_ReturnsFalseOnNetworkError()
    {
        var logger = new FakeLogger<KeepAliveService>();
        var svc = Build(
            logger,
            "https://tc.example/api/test",
            handler: new StubHandler(_ => throw new HttpRequestException("engine down")));

        var ok = await svc.PingOnceAsync();

        Assert.False(ok);
        Assert.Contains(logger.Entries, e => e.Level == LogLevel.Warning && e.Message.Contains("ping error"));
    }

    [Fact]
    public async Task ExecuteAsync_Disables_WhenNoTargetUrlConfigured()
    {
        var logger = new FakeLogger<KeepAliveService>();
        var svc = new TestableKeepAliveService(logger, targetUrl: null);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
        await svc.RunExecute(cts.Token);

        Assert.Contains(logger.Entries, e => e.Message.Contains("disabled"));
    }

    private sealed class TestableKeepAliveService : KeepAliveService
    {
        public TestableKeepAliveService(FakeLogger<KeepAliveService> logger, string? targetUrl)
            : base(
                new FakeFactory(new HttpClient(new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK))))),
                Options.Create(new KeepAliveOptions
                {
                    TargetUrl = targetUrl,
                    IntervalMinutes = 5,
                    SlowThresholdMs = 5000,
                }),
                logger)
        {
        }

        public Task RunExecute(CancellationToken cancellationToken) => ExecuteAsync(cancellationToken);
    }
}