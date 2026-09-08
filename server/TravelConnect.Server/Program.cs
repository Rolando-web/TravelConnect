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

var payMongoConfig = builder.Configuration.GetSection("PayMongo");

builder.Services.AddOptions<PayMongoOptions>()
    .Bind(payMongoConfig)
    .Validate(o => !string.IsNullOrWhiteSpace(o.SecretKey), "PayMongo SecretKey is required.")
    .Validate(o => !string.IsNullOrWhiteSpace(o.PublicKey), "PayMongo PublicKey is required.");

// PayMongoService takes the concrete PayMongoOptions in its constructor, so it
// must be resolvable directly (not only as IOptions<PayMongoOptions>). Without
// this, DI throws "Unable to resolve service for type PayMongoOptions" and the
// PayMongo checkout never opens.
builder.Services.AddSingleton(payMongoConfig.Get<PayMongoOptions>() ?? new PayMongoOptions());

builder.Services.AddHttpClient<PayMongoService>();

// Email and PDF services
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<EmailService>();
builder.Services.AddSingleton<PdfService>();

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
var corsAllowAll = corsOrigins == null || corsOrigins.Length == 0;

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                if (corsAllowAll) return true;
                return !string.IsNullOrWhiteSpace(origin)
                       && (origin.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase)
                           || corsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase));
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseHttpsRedirection();

app.UseCors("ReactPolicy");

app.MapControllers();

var reseed = args.Contains("--reseed");
await app.InitializeDatabaseAsync(reseed);

app.Run();