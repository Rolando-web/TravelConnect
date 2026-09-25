using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace TravelConnect.Server.Middleware;

/// <summary>
/// Configuration for <see cref="RequestTimingMiddleware"/>.
/// </summary>
public class RequestTimingOptions
{
    /// <summary>Elapsed ms at/above which a request is logged as SLOW (warning).</summary>
    public int SlowThresholdMs { get; set; } = 1000;
}

/// <summary>
/// Phase 13 — request observability. Measures every request with a Stopwatch,
/// emits "<c>[Timing] METHOD /path?query -&gt; STATUS in Nms</c>" to ILogger and
/// stamps an <c>X-Elapsed-Ms</c> header so the admin panel and CI can see the
/// exact server-side cost of a save. Slow requests (&gt;= SlowThresholdMs) are
/// logged as warnings — this is what exposes a MonsterASP cold start (20-30s)
/// versus genuine controller work in production.
/// </summary>
public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;
    private readonly int _slowThresholdMs;

    public RequestTimingMiddleware(
        RequestDelegate next,
        ILogger<RequestTimingMiddleware> logger,
        IOptions<RequestTimingOptions> options)
    {
        _next = next;
        _logger = logger;
        _slowThresholdMs = options.Value.SlowThresholdMs;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        // Headers must be stamped BEFORE the response commits (Kestrel flushes
        // once the MVC chain returns), so register an OnStarting callback — the
        // server invokes it at the point headers are about to be sent, while they
        // are still writable. Streaming endpoints are covered too (first flush).
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Elapsed-Ms"] = sw.ElapsedMilliseconds.ToString();
            context.Response.Headers["X-Request-Id"] = Guid.NewGuid().ToString("N");
            return Task.CompletedTask;
        });

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            var elapsed = sw.ElapsedMilliseconds;
            var method = context.Request.Method;
            var path = context.Request.Path + context.Request.QueryString.Value;
            var status = context.Response.StatusCode;

            if (elapsed >= _slowThresholdMs)
            {
                _logger.LogWarning(
                    "SLOW request {Method} {Path} -> {Status} in {Elapsed}ms (>= {Threshold}ms)",
                    method, path, status, elapsed, _slowThresholdMs);
            }
            else
            {
                _logger.LogInformation(
                    "[Timing] {Method} {Path} -> {Status} in {Elapsed}ms",
                    method, path, status, elapsed);
            }
        }
    }
}

public static class RequestTimingExtensions
{
    /// <summary>
    /// Adds the request-timing middleware. Place it early (after exception
    /// handling) so the Stopwatch spans the whole pipeline; the finally block
    /// guarantees the header/timing is emitted even when the handler throws.
    /// Configure the threshold via <c>RequestTiming:SlowThresholdMs</c>.
    /// </summary>
    public static IApplicationBuilder UseRequestTiming(this IApplicationBuilder app) =>
        app.UseMiddleware<RequestTimingMiddleware>();
}