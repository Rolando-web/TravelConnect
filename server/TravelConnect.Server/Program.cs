using TravelConnect.Server.Data.Connections;
using TravelConnect.Server.Extensions;
using TravelConnect.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddTravelConnectSql(builder.Configuration);

builder.Services.AddOptions<PayMongoOptions>()
    .Bind(builder.Configuration.GetSection("PayMongo"))
    .Validate(o => !string.IsNullOrWhiteSpace(o.SecretKey), "PayMongo SecretKey is required.")
    .Validate(o => !string.IsNullOrWhiteSpace(o.PublicKey), "PayMongo PublicKey is required.");
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