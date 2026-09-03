using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace TravelConnect.Server.Services;

public class PayMongoOptions
{
    public string SecretKey { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = "https://api.paymongo.com";
    public string WebhookSecretKey { get; set; } = string.Empty;
}

public record CreateSourceResult(string SourceId, string CheckoutUrl, string Status);
public record SourceStatusResult(string SourceId, string Status, string? FailureReason);

public class PayMongoService
{
    private readonly HttpClient _http;
    private readonly string _apiBase;
    private readonly string _publicKey;
    private readonly string _secretKey;
    private readonly string _webhookSecretKey;

    public PayMongoService(HttpClient http, PayMongoOptions options)
    {
        _http = http;
        _apiBase = options.ApiBaseUrl.TrimEnd('/');
        // Sources/ewallets are created with the public key; payments (and
        // source retrieval in some plans) with the secret key.
        _publicKey = options.PublicKey;
        _secretKey = options.SecretKey;
        _webhookSecretKey = options.WebhookSecretKey;
    }

    private void SetAuth(string apiKey)
    {
        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{apiKey}:")));
    }

    private async Task<JsonElement> PostAsync(string endpoint, object payload, string apiKey)
    {
        SetAuth(apiKey);
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _http.PostAsync($"{_apiBase}{endpoint}", content);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"PayMongo {endpoint} failed ({response.StatusCode}): {body}");
        }
        return JsonDocument.Parse(body).RootElement;
    }

    private async Task<JsonElement> GetAsync(string endpoint, string apiKey)
    {
        SetAuth(apiKey);
        var response = await _http.GetAsync($"{_apiBase}{endpoint}");
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"PayMongo {endpoint} failed ({response.StatusCode}): {body}");
        }
        return JsonDocument.Parse(body).RootElement;
    }

    private static object SourcePayload(string type, long amountCentavos, string successUrl, string failedUrl) => new
    {
        data = new
        {
            attributes = new
            {
                type,
                amount = amountCentavos,
                currency = "PHP",
                redirect = new
                {
                    success = successUrl,
                    failed = failedUrl
                }
            }
        }
    };

    public async Task<CreateSourceResult> CreateSourceAsync(
        string type,
        decimal amountPesos,
        string successUrl,
        string failedUrl)
    {
        var amountCentavos = (long)Math.Round(amountPesos * 100);
        var root = await PostAsync("/v1/sources", SourcePayload(type, amountCentavos, successUrl, failedUrl), _publicKey);

        var data = root.TryGetProperty("data", out var d) ? d : root;
        var id = data.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? string.Empty : string.Empty;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;

        if (string.IsNullOrWhiteSpace(id) && attrs.TryGetProperty("id", out var aid))
        {
            id = aid.GetString() ?? string.Empty;
        }

        var status = attrs.TryGetProperty("status", out var st) ? st.GetString() ?? "pending" : "pending";
        var checkoutUrl = string.Empty;

        if (attrs.TryGetProperty("redirect", out var redirect) &&
            redirect.TryGetProperty("checkout_url", out var checkout) &&
            checkout.ValueKind == JsonValueKind.String)
        {
            checkoutUrl = checkout.GetString() ?? string.Empty;
        }

        return new CreateSourceResult(id, checkoutUrl, status);
    }

    public async Task<SourceStatusResult> GetSourceAsync(string sourceId)
    {
        var root = await GetAsync($"/v1/sources/{sourceId}", _secretKey);
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;
        var status = attrs.TryGetProperty("status", out var st) ? st.GetString() ?? "unknown" : "unknown";
        string? failure = null;
        if (attrs.TryGetProperty("failure_reason", out var fr) && fr.ValueKind == JsonValueKind.String)
        {
            failure = fr.GetString();
        }
        return new SourceStatusResult(sourceId, status, failure);
    }

    private static object PaymentPayload(long amountCentavos, string sourceId, string description, string statementDescriptor) => new
    {
        data = new
        {
            attributes = new
            {
                amount = amountCentavos,
                currency = "PHP",
                description,
                statement_descriptor = statementDescriptor,
                source = new
                {
                    id = sourceId,
                    type = "source"
                }
            }
        }
    };

    public async Task<string> CreatePaymentAsync(
        decimal amountPesos,
        string sourceId,
        string description,
        string statementDescriptor)
    {
        var amountCentavos = (long)Math.Round(amountPesos * 100);
        var root = await PostAsync("/v1/payments", PaymentPayload(amountCentavos, sourceId, description, statementDescriptor), _secretKey);
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var id = data.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? string.Empty : string.Empty;
        if (string.IsNullOrWhiteSpace(id) && data.TryGetProperty("attributes", out var attrs) && attrs.TryGetProperty("id", out var aid))
        {
            id = aid.GetString() ?? string.Empty;
        }
        return id;
    }

    public async Task<(string SourceId, string Status)> GetPaymentAsync(string paymentId)
    {
        var root = await GetAsync($"/v1/payments/{paymentId}", _secretKey);
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;
        var status = attrs.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.String
            ? st.GetString() ?? string.Empty
            : string.Empty;
        var sourceId = string.Empty;
        if (attrs.TryGetProperty("source", out var src) && src.ValueKind == JsonValueKind.Object)
        {
            sourceId = src.TryGetProperty("id", out var sid) ? sid.GetString() ?? string.Empty : string.Empty;
        }
        return (sourceId, status);
    }

    // PayMongo signs webhook payloads with HMAC-SHA256 using the payload
    // body and the configured Webhook Secret Key (from the dashboard).
    public bool VerifyWebhookSignature(string payloadBody, string signature, string timestamp)
    {
        if (string.IsNullOrWhiteSpace(_webhookSecretKey))
            return false;

        var dataToSign = $"{timestamp}.{payloadBody}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_webhookSecretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign));
        var expected = Convert.ToHexString(hash);
        return FixedTimeEquals(expected, signature?.Replace("-", "").ToUpperInvariant() ?? string.Empty);
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var result = 0;
        for (var i = 0; i < a.Length; i++)
            result |= a[i] ^ b[i];
        return result == 0;
    }
}
