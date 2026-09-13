using Microsoft.AspNetCore.HttpOverrides;
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
builder.Services.AddSingleton(payMongoOptions);

builder.Services.AddHttpClient<PayMongoService>();

// Email and PDF services
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<EmailService>();
builder.Services.AddSingleton<PdfService>();
builder.Services.AddSingleton<CancellationService>();

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

app.UseCors("ReactPolicy");

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