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

public record CheckoutSessionResult(string SessionId, string CheckoutUrl, string Status);
public record CheckoutSessionStatusResult(string SessionId, string Status, string? FailureReason);

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
        // Checkout Session (hosted page) creation/retrieval uses the secret key;
        // the public key is only used for client-side checks.
        _publicKey = options.PublicKey;
        _secretKey = options.SecretKey;
        _webhookSecretKey = options.WebhookSecretKey;
    }

    private static HttpRequestMessage BuildRequest(HttpMethod method, string url, string apiKey,
        object? payload = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization =
            new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{apiKey}:")));
        if (payload is not null)
        {
            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }
        return request;
    }

    // Note: JsonDocument implements IDisposable. We clone the RootElement so we
    // can dispose the document here and return a value that owns its memory.
    private async Task<JsonElement> SendAsync(HttpRequestMessage request)
    {
        var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"PayMongo {request.RequestUri?.PathAndQuery} failed ({response.StatusCode}): {body}");
        }

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.Clone();
    }

    private Task<JsonElement> PostAsync(string endpoint, object payload, string apiKey)
    {
        var request = BuildRequest(HttpMethod.Post, $"{_apiBase}{endpoint}", apiKey, payload);
        return SendAsync(request);
    }

    private Task<JsonElement> GetAsync(string endpoint, string apiKey)
    {
        var request = BuildRequest(HttpMethod.Get, $"{_apiBase}{endpoint}", apiKey);
        return SendAsync(request);
    }

    // Creates a hosted Checkout Session. The customer completes the payment on
    // PayMongo's own page (checkout.paymongo.com/<id>), away from our UI.
    public async Task<CheckoutSessionResult> CreateCheckoutSessionAsync(
        long amountCentavos,
        IReadOnlyList<string> paymentMethodTypes,
        string description,
        string successUrl,
        string cancelUrl,
        string? bookingReference = null)
    {
        var payload = new
        {
            data = new
            {
                attributes = new
                {
                    line_items = new[]
                    {
                        new
                        {
                            currency = "PHP",
                            amount = amountCentavos,
                            description,
                            name = description,
                            quantity = 1
                        }
                    },
                    payment_method_types = paymentMethodTypes,
                    description,
                    success_url = successUrl,
                    cancel_url = cancelUrl,
                    metadata = new Dictionary<string, string>
                    {
                        ["booking_reference"] = bookingReference ?? string.Empty
                    }
                }
            }
        };

        var root = await PostAsync("/v1/checkout_sessions", payload, _secretKey);
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var id = data.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? string.Empty : string.Empty;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;

        if (string.IsNullOrWhiteSpace(id) && attrs.TryGetProperty("id", out var aid))
            id = aid.GetString() ?? string.Empty;

        var checkoutUrl = attrs.TryGetProperty("checkout_url", out var cu) && cu.ValueKind == JsonValueKind.String
            ? cu.GetString() ?? string.Empty
            : string.Empty;
        var status = attrs.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.String
            ? st.GetString() ?? "open"
            : "open";

        return new CheckoutSessionResult(id, checkoutUrl, status);
    }

    // Reads a Checkout Session and normalizes its payment outcome so the client
    // can poll it: paid / cancelled / failed / pending.
    public async Task<CheckoutSessionStatusResult> GetCheckoutSessionAsync(string sessionId)
    {
        var root = await GetAsync($"/v1/checkout_sessions/{sessionId}", _secretKey);
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;

        var intent = attrs.TryGetProperty("payment_intent", out var pi) ? pi : default;
        var intentAttrs = intent.ValueKind == JsonValueKind.Object && intent.TryGetProperty("attributes", out var ia)
            ? ia
            : intent;

        var intentStatus = intentAttrs.ValueKind == JsonValueKind.Object &&
                            intentAttrs.TryGetProperty("status", out var ist) && ist.ValueKind == JsonValueKind.String
            ? ist.GetString() ?? string.Empty
            : string.Empty;

        var sessionStatus = attrs.TryGetProperty("status", out var ss) && ss.ValueKind == JsonValueKind.String
            ? ss.GetString() ?? string.Empty
            : string.Empty;

        var paidAt = attrs.TryGetProperty("paid_at", out var pa) && pa.ValueKind != JsonValueKind.Null;

        var anyPaid = false;
        if (intentAttrs.ValueKind == JsonValueKind.Object &&
            intentAttrs.TryGetProperty("payments", out var payments) && payments.ValueKind == JsonValueKind.Array)
        {
            foreach (var p in payments.EnumerateArray())
            {
                var pattrs = p.TryGetProperty("attributes", out var a2) ? a2 : p;
                if (pattrs.TryGetProperty("status", out var pst) && pst.ValueKind == JsonValueKind.String &&
                    pst.GetString()?.Equals("paid", StringComparison.OrdinalIgnoreCase) == true)
                {
                    anyPaid = true;
                    break;
                }
            }
        }

        var normalized = intentStatus.ToLowerInvariant();
        if (paidAt || anyPaid || normalized == "succeeded")
        {
            return new CheckoutSessionStatusResult(sessionId, "paid", null);
        }
        if (normalized == "cancelled" || normalized == "expired" ||
            sessionStatus.Equals("cancelled", StringComparison.OrdinalIgnoreCase) ||
            sessionStatus.Equals("expired", StringComparison.OrdinalIgnoreCase))
        {
            return new CheckoutSessionStatusResult(
                sessionId,
                normalized == "expired" || sessionStatus.Equals("expired", StringComparison.OrdinalIgnoreCase)
                    ? "expired"
                    : "cancelled",
                null);
        }
        if (normalized == "failed")
        {
            string? failure = null;
            if (intentAttrs.TryGetProperty("last_payment_error", out var lpe) && lpe.ValueKind == JsonValueKind.String)
                failure = lpe.GetString();
            return new CheckoutSessionStatusResult(sessionId, "failed", failure);
        }

        return new CheckoutSessionStatusResult(sessionId, "pending", null);
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
