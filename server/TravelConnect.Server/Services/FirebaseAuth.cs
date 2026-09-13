using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace TravelConnect.Server.Services;

/// <summary>
/// Validates Firebase Auth ID tokens (JWT) using Google's public cert
/// endpoint, so the API can authorize requests without needing a
/// Firestore service-account key on the server.
/// </summary>
public static class FirebaseAuth
{
    private const string CertUrl =
        "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

    private static readonly HttpClient Http = new();
    private static readonly Dictionary<string, SecurityKey> CertCache = new();
    private static DateTime _certsFetchedAt = DateTime.MinValue;

    public static void AddFirebaseAuth(this IServiceCollection services, string projectId)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"https://securetoken.google.com/{projectId}";
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = $"https://securetoken.google.com/{projectId}",
                    ValidateAudience = true,
                    ValidAudience = projectId,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ClockSkew = TimeSpan.FromSeconds(60),
                    IssuerSigningKeyResolver = (token, securityToken, kid, parameters) =>
                        GetSigningKeys(kid)
                };
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = ctx =>
                    {
                        // The Firebase Subject claim is the user's Auth UID.
                        var uid = ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                               ?? ctx.Principal?.FindFirst("user_id")?.Value;
                        if (!string.IsNullOrWhiteSpace(uid))
                        {
                            ((ClaimsIdentity)ctx.Principal!.Identity!).AddClaim(
                                new Claim("uid", uid));
                        }
                        return Task.CompletedTask;
                    }
                };
            });
    }

    private static IEnumerable<SecurityKey> GetSigningKeys(string? kid)
    {
        EnsureCertsLoaded();
        if (kid is not null && CertCache.TryGetValue(kid, out var cached))
            return new[] { cached };

        // Refresh once and re-check before returning (certs rotate).
        RefreshCerts();
        if (kid is not null && CertCache.TryGetValue(kid, out var key))
            return new[] { key };

        return Array.Empty<SecurityKey>();
    }

    private static void EnsureCertsLoaded()
    {
        if (CertCache.Count > 0 && DateTime.UtcNow - _certsFetchedAt < TimeSpan.FromHours(12))
            return;
        RefreshCerts();
    }

    private static void RefreshCerts()
    {
        try
        {
            var response = Http.GetStringAsync(CertUrl)
                .ConfigureAwait(false).GetAwaiter().GetResult();
            var doc = System.Text.Json.JsonDocument.Parse(response);
            var keys = new Dictionary<string, SecurityKey>();
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                var certPem = prop.Value.GetString();
                if (string.IsNullOrWhiteSpace(certPem)) continue;
                try
                {
                    var cert = X509Certificate2.CreateFromPem(certPem);
                    keys[prop.Name] = new X509SecurityKey(cert);
                }
                catch (CryptographicException)
                {
                    // Skip malformed certs; validation will fail closed below.
                }
            }

            if (keys.Count > 0)
            {
                lock (CertCache)
                {
                    CertCache.Clear();
                    foreach (var kv in keys) CertCache[kv.Key] = kv.Value;
                    _certsFetchedAt = DateTime.UtcNow;
                }
            }
        }
        catch (Exception)
        {
            // Network failure; keep whatever cached keys we have. Owned keys are
            // still usable, so validation will fail closed on unknown kids.
        }
    }
}