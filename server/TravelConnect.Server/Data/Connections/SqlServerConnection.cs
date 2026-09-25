using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;

namespace TravelConnect.Server.Data.Connections;

public static class SqlServerConnection
{
    public static IServiceCollection AddTravelConnectSql(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("TravelConnect")
            ?? throw new InvalidOperationException(
                "Connection string 'TravelConnect' not found. " +
                "Add it to appsettings.json or user-secrets.");

        services.AddDbContext<TravelConnectDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
            {
                sql.MigrationsAssembly("TravelConnect.Server");
                // Phase 13 — bounded retry window. 5 retries x up to 10s headroom
                // reverts a dropped SQL connection without letting a retry storm
                // compound a cold start. Tune via Sql:MaxRetryCount / Sql:MaxRetryDelaySeconds.
                var maxRetryCount = configuration.GetValue("Sql:MaxRetryCount", 5);
                var maxRetryDelay = TimeSpan.FromSeconds(configuration.GetValue("Sql:MaxRetryDelaySeconds", 10));
                sql.EnableRetryOnFailure(
                    maxRetryCount: maxRetryCount,
                    maxRetryDelay: maxRetryDelay,
                    errorNumbersToAdd: null);
            }));

        return services;
    }
}
