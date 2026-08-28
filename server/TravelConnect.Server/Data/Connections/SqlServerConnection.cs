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
                sql.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorNumbersToAdd: null);
            }));

        return services;
    }
}
