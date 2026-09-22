using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using TravelConnect.Server.Data.Connections;
using TravelConnect.Server.Extensions;
using TravelConnect.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Cap request bodies (JSON payloads are small; the 10 MB ceiling still
// accommodates image uploads while blocking oversized data floods).
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10 MB
    options.Limits.MaxRequestBufferSize = 10 * 1024 * 1024;
});
builder.Services.AddTravelConnectSql(builder.Configuration);

var firebaseProjectId = builder.Configuration["Authentication:FirebaseProjectId"] ?? string.Empty;
if (!string.IsNullOrWhiteSpace(firebaseProjectId))
{
    builder.Services.AddFirebaseAuth(firebaseProjectId);
}

var payMongoConfig = builder.Configuration.GetSection("PayMongo");

builder.Services.AddOptions<PayMongoOptions>()
    .Bind(payMongoConfig)
    .Validate(o => !string.IsNullOrWhiteSpace(o.SecretKey), "PayMongo SecretKey is required.")
    .Validate(o => !string.IsNullOrWhiteSpace(o.PublicKey), "PayMongo PublicKey is required.");

// PayMongoService takes the concrete PayMongoOptions in its constructor, so it
// must be resolvable directly (not only as IOptions<PayMongoOptions>). Without
// this, DI throws "Unable to resolve service for type PayMongoOptions" and the
// PayMongo checkout never opens.
var payMongoOptions = new PayMongoOptions();
payMongoConfig.Bind(payMongoOptions);

// TEST-MODE ONLY: fail fast rather than charge real cards if a live key shows up.
PayMongoService.GuardTestMode(payMongoOptions);

builder.Services.AddSingleton(payMongoOptions);

builder.Services.AddHttpClient<PayMongoService>();

// Email and PDF services
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<EmailService>();
builder.Services.AddSingleton<PdfService>();
builder.Services.AddSingleton<CancellationService>();

// Promo validation is shared by the public validation endpoint and the booking
// pipeline. It consumes the scoped DbContext, so it must be scoped too.
builder.Services.AddScoped<PromoService>();

// EmailJS admin notifications (sent server-side so the email path is
// rate-limited like the inquiry endpoint it rides on).
builder.Services.Configure<EmailJsOptions>(builder.Configuration.GetSection("EmailJs"));
builder.Services.AddHttpClient<EmailJsService>();

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
var corsAllowAll = corsOrigins == null || corsOrigins.Length == 0;

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                if (corsAllowAll) return true;
                return corsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ── Rate limiting ─────────────────────────────────────────────────
// Anonymously reachable endpoints (inquiries, bookings, payments,
// leads) are spam/bot targets, so throttle them per client IP. Admins
// hitting the JSON API from one office IP won't trip the generous
// default; the "strict" policy only binds the anonymous write paths.
var clientIp = static (HttpContext ctx) =>
    ctx.Connection.RemoteIpAddress?.IsIPv4MappedToIPv6 == true
        ? ctx.Connection.RemoteIpAddress.MapToIPv4().ToString()
        : ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        ctx => RateLimitPartition.GetFixedWindowLimiter(
            clientIp(ctx),
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 300,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));

    options.AddPolicy("anonymous-write", ctx => RateLimitPartition.GetFixedWindowLimiter(
        clientIp(ctx),
        _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = 10,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(1)
        }));

    // Generous read budget for anonymous browsing/search endpoints so scrape
    // bots can't hammer search while real customers never notice the limit.
    options.AddPolicy("public-read", ctx => RateLimitPartition.GetFixedWindowLimiter(
        clientIp(ctx),
        _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = 120,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(1)
        }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { message = "Too many requests. Please slow down and try again in a minute." },
            token);
    };
});

// Response cache for hot read-only endpoints (dashboard public stats,
// featured packages, destinations). Short TTL keeps the catalog fresh while
// sparing SQL Server from repeated full-table scans on every page load.
builder.Services.AddResponseCaching();

var app = builder.Build();

// TLS is normally terminated at the reverse proxy (nginx/Vercel/Render), so
// honour the forwarded scheme and only redirect locally when a real HTTPS
// request came in unencrypted.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
if (!app.Environment.IsDevelopment())
{
    // Keep the redirect for real HTTPS deployments behind a proxy that has not
    // set X-Forwarded-Proto; harmless otherwise because the forwarded headers
    // middleware above maps the original https scheme onto the request.
    app.UseHttpsRedirection();
}

// Return clean JSON for unhandled errors (never leak stack traces).
app.UseExceptionHandler(exApp =>
{
    exApp.Run(async ctx =>
    {
        var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsJsonAsync(new
        {
            message = "An unexpected error occurred.",
            detail = app.Environment.IsDevelopment() ? ex?.Message : null
        });
    });
});

// Basic hardening headers applied to every response.
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});

app.UseCors("ReactPolicy");

app.UseResponseCaching();

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

var reseed = args.Contains("--reseed");
var connStr = builder.Configuration.GetConnectionString("TravelConnect") ?? "";
if (string.IsNullOrWhiteSpace(connStr))
{
    Console.WriteLine("[DB] WARNING: ConnectionStrings:TravelConnect is EMPTY. Check the ConnectionStrings__TravelConnect env var on Render.");
}
else
{
    try
    {
        var csb = new SqlConnectionStringBuilder(connStr);
        Console.WriteLine($"[DB] Connecting to SQL Server '{csb.DataSource}' (database '{csb.InitialCatalog}', SQL auth: {csb.IntegratedSecurity == false})");
    }
    catch
    {
        Console.WriteLine("[DB] ConnectionStrings:TravelConnect is set but could not be parsed as a valid connection string.");
    }
}
await app.InitializeDatabaseAsync(reseed);

app.Run();