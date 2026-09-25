using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace TravelConnect.Server.Services;

/// <summary>
/// Configuration for <see cref="KeepAliveService"/>.
/// </summary>
public class KeepAliveOptions
{
    /// <summary>Absolute health URL to ping (e.g. https://travelconnect.runasp.net/api/test). Empty = disabled.</summary>
    public string? TargetUrl { get; set; }

    /// <summary>How often to ping while the app is up.</summary>
    public int IntervalMinutes { get; set; } = 5;

    /// <summary>Aping the target but exceeding this many ms strongly suggests a cold start.</summary>
    public int SlowThresholdMs { get; set; } = 5000;
}

/// <summary>
/// Phase 13 — App-Pool keep-alive. Free-tier hosts (MonsterASP et al.) recycle
/// the worker after ~20 minutes idle, so the first create/edit after idle pays a
/// 20-30s cold boot. This background service pings a cheap endpoint on a timer,
/// which keeps the pool warm AND — because RequestTimingMiddleware logs every
/// call — turns an honest "first request after idle" timestamp into the log line
/// that proves the cold-start theory (and measures the fix).
/// </summary>
public class KeepAliveService : BackgroundService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<KeepAliveService> _logger;
    private readonly KeepAliveOptions _options;

    public KeepAliveService(
        IHttpClientFactory httpClientFactory,
        IOptions<KeepAliveOptions> options,
        ILogger<KeepAliveService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.TargetUrl))
        {
            _logger.LogInformation(
                "[KeepAlive] disabled — no KeepAlive:TargetUrl configured (set KeepAlive__TargetUrl on the host).");
            return;
        }

        var interval = TimeSpan.FromMinutes(Math.Max(1, _options.IntervalMinutes));
        _logger.LogInformation(
            "[KeepAlive] enabled — pinging {Target} every {Interval} min.",
            _options.TargetUrl, interval.TotalMinutes);

        using var timer = new PeriodicTimer(interval);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
                await PingOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[KeepAlive] ping failed: {Target}", _options.TargetUrl);
            }
        }
    }

    /// <summary>
    /// Executed by the timer loop; extracted so unit tests can drive it with a
    /// stub client without waiting on PeriodicTimer.
    /// </summary>
    public async Task<bool> PingOnceAsync(CancellationToken cancellationToken = default)
    {
        var target = _options.TargetUrl;
        try
        {
            using var client = _httpClientFactory.CreateClient("keepalive");
            var sw = Stopwatch.StartNew();
            using var response = await client.GetAsync(target, cancellationToken);
            sw.Stop();

            var elapsed = sw.ElapsedMilliseconds;
            if (elapsed >= _options.SlowThresholdMs)
            {
                _logger.LogWarning(
                    "[KeepAlive] slow ping {Target} -> {Status} in {Elapsed}ms (cold start?)",
                    target, (int)response.StatusCode, elapsed);
            }
            else
            {
                _logger.LogInformation(
                    "[KeepAlive] {Target} -> {Status} in {Elapsed}ms",
                    target, (int)response.StatusCode, elapsed);
            }
            return response.IsSuccessStatusCode;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[KeepAlive] ping error: {Target}", target);
            return false;
        }
    }
}