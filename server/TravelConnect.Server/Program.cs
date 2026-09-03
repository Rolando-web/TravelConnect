using TravelConnect.Server.Data.Connections;
using TravelConnect.Server.Extensions;
using TravelConnect.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
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