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

    /// <summary>
    /// This build is TEST-MODE ONLY. Gate payments on PayMongo's sandbox
    /// (sk_test_/pk_test_); live keys are rejected by <see cref="PayMongoService
    /// .GuardTestMode"/> unless this is explicitly set to "live".
    /// </summary>
    public string Mode { get; set; } = "test";
}

public record CheckoutSessionResult(string SessionId, string CheckoutUrl, string Status);
public record CheckoutSessionStatusResult(string SessionId, string Status, string? FailureReason);

// In-app card payment (PayMongo Payment Intents). Card details are collected
// on our checkout page, tokenized server-side, then attached to a Payment
// Intent which may escalate to 3-D Secure (next_action.redirect).
public record CardPaymentIntentResult(
    string IntentId,
    string ClientKey,
    string Status,
    string? RedirectUrl = null,
    string? FailureReason = null,
    decimal AmountPesos = 0,
    string? BookingReference = null);

public record CardDetails(
    string Number,
    int ExpMonth,
    int ExpYear,
    string Cvc,
    string? HolderName = null,
    string? BillingEmail = null);

public class PayMongoService
{
    private readonly HttpClient _http;
    private readonly string _apiBase;
    private readonly string _secretKey;
    private readonly string _webhookSecretKey;

    public PayMongoService(HttpClient http, PayMongoOptions options)
    {
        GuardTestMode(options);
        _http = http;
        _apiBase = options.ApiBaseUrl.TrimEnd('/');
        _secretKey = options.SecretKey;
        _webhookSecretKey = options.WebhookSecretKey;
    }

    /// <summary>
    /// Enforces the TEST-MODE-ONLY guarantee for payments: if a live PayMongo
    /// key is ever configured, the process refuses to start (fail fast) instead
    /// of charging real cards. Flipping <see cref="PayMongoOptions.Mode"/> to
    /// "live" is the explicit, auditable opt-in for a future production rollout.
    /// </summary>
    public static void GuardTestMode(PayMongoOptions options)
    {
        var secretLive = options.SecretKey.StartsWith("sk_live_", StringComparison.OrdinalIgnoreCase);
        var publicLive = options.PublicKey.StartsWith("pk_live_", StringComparison.OrdinalIgnoreCase);

        if ((secretLive || publicLive) &&
            !"live".Equals(options.Mode, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "PayMongo LIVE key detected while Mode=test. This build is TEST-MODE ONLY — " +
                "use sk_test_/pk_test_ sandbox keys, or explicitly set PayMongo:Mode=live.");
        }
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

    // ── Card payments (Payment Intents) ─────────────────────────────────

    // Creates a card-only Payment Intent. The customer's card is attached in a
    // second call; if 3-D Secure is required the intent moves to
    // "awaiting_next_action" with a redirect URL the client must open.
    public async Task<CardPaymentIntentResult> CreateCardPaymentIntentAsync(
        long amountCentavos,
        string description,
        string returnUrl,
        string? bookingReference = null)
    {
        var payload = new
        {
            data = new
            {
                attributes = new
                {
                    amount = amountCentavos,
                    currency = "PHP",
                    description,
                    payment_method_allowed = new[] { "card" },
                    payment_method_options = new
                    {
                        card = new { request_three_d_secure = "any" }
                    },
                    return_url = returnUrl,
                    metadata = new Dictionary<string, string>
                    {
                        ["booking_reference"] = bookingReference ?? string.Empty
                    }
                }
            }
        };

        var root = await PostAsync("/v1/payment_intents", payload, _secretKey);
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;

        var id = data.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String
            ? idProp.GetString() ?? string.Empty
            : (attrs.TryGetProperty("id", out var aid) && aid.ValueKind == JsonValueKind.String
                ? aid.GetString() ?? string.Empty
                : string.Empty);

        var clientKey = attrs.TryGetProperty("client_key", out var ck) && ck.ValueKind == JsonValueKind.String
            ? ck.GetString() ?? string.Empty
            : string.Empty;
        var status = attrs.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.String
            ? st.GetString() ?? "awaiting_payment_method"
            : "awaiting_payment_method";

        return new CardPaymentIntentResult(id, clientKey, NormalizeIntentStatus(status));
    }

    // Tokenizes the card and attaches it to a Payment Intent. The intent is
    // then attempted by PayMongo, which either succeeds, fails, or requests
    // 3-D Secure (redirect). Never store the card on disk — it only transits
    // from the checkout form to PayMongo in memory.
    public async Task<CardPaymentIntentResult> AttachCardToPaymentIntentAsync(
        string intentId,
        CardDetails card)
    {
        if (string.IsNullOrWhiteSpace(intentId))
            throw new ArgumentException("Payment intent id is required.", nameof(intentId));

        var paymentMethodPayload = new
        {
            data = new
            {
                attributes = new
                {
                    type = "card",
                    details = new
                    {
                        card_number = card.Number.Replace(" ", string.Empty),
                        exp_month = card.ExpMonth,
                        exp_year = card.ExpYear,
                        cvc = card.Cvc
                    },
                    billing = new
                    {
                        name = string.IsNullOrWhiteSpace(card.HolderName) ? "Cardholder" : card.HolderName,
                        email = string.IsNullOrWhiteSpace(card.BillingEmail)
                            ? "guest@travelconnect.ph"
                            : card.BillingEmail
                    }
                }
            }
        };
        JsonElement pmRoot;
        try
        {
            pmRoot = await PostAsync("/v1/payment_methods", paymentMethodPayload, _secretKey);
        }
        catch (HttpRequestException ex) when (TryGetPayMongoErrorDetail(ex, out var reason))
        {
            // Card was rejected before tokenization (test-mode card vs live-mode
            // request, invalid format, etc.) — surface PayMongo's human message.
            throw new HttpRequestException(reason, ex);
        }
        var pmData = pmRoot.TryGetProperty("data", out var pmd) ? pmd : pmRoot;
        var pmId = pmData.TryGetProperty("id", out var pmIdProp) && pmIdProp.ValueKind == JsonValueKind.String
            ? pmIdProp.GetString() ?? string.Empty
            : string.Empty;
        if (string.IsNullOrWhiteSpace(pmId))
            throw new HttpRequestException("PayMongo did not return a card token.");

        var attachPayload = new
        {
            data = new
            {
                attributes = new { payment_method = pmId }
            }
        };
        JsonElement root;
        try
        {
            root = await PostAsync($"/v1/payment_intents/{intentId}/attach", attachPayload, _secretKey);
        }
        catch (HttpRequestException ex) when (TryGetPayMongoErrorDetail(ex, out var reason))
        {
            // PayMongo declined the card at attach (insufficient funds, expired
            // card, invalid CVC, …). The intent is terminal-failed; surface a
            // friendly failure instead of a cryptic raw 400.
            return new CardPaymentIntentResult(intentId, string.Empty, "failed", null, reason);
        }
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;

        return NormalizeIntentResponse(intentId, attrs);
    }

    // Reads a Payment Intent after 3-D Secure so the checkout can poll for a
    // terminal state (succeeded / failed).
    public async Task<CardPaymentIntentResult> GetCardPaymentIntentAsync(string intentId)
    {
        var root = await GetAsync($"/v1/payment_intents/{intentId}", _secretKey);
        var data = root.TryGetProperty("data", out var d) ? d : root;
        var attrs = data.TryGetProperty("attributes", out var a) ? a : data;
        return NormalizeIntentResponse(intentId, attrs);
    }

    // Pulls the human-readable `detail` (plus machine `sub_code`) out of a
    // PayMongo error response that PostAsync embeds in its HttpRequestException
    // message, so declines and card rejections appear as friendly text.
    private static bool TryGetPayMongoErrorDetail(HttpRequestException ex, out string? detail)
    {
        detail = null;
        var bodyStart = ex.Message.IndexOf('{');
        if (bodyStart < 0) return false;
        var body = ex.Message.Substring(bodyStart);
        if (body.IndexOf("errors", StringComparison.OrdinalIgnoreCase) < 0) return false;

        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("errors", out var errors) &&
                errors.ValueKind == JsonValueKind.Array)
            {
                foreach (var error in errors.EnumerateArray())
                {
                    if (error.ValueKind != JsonValueKind.Object) continue;
                    if (error.TryGetProperty("detail", out var d) &&
                        d.ValueKind == JsonValueKind.String &&
                        !string.IsNullOrWhiteSpace(d.GetString()))
                    {
                        detail = d.GetString();
                        if (error.TryGetProperty("sub_code", out var sc) &&
                            sc.ValueKind == JsonValueKind.String &&
                            !string.IsNullOrWhiteSpace(sc.GetString()))
                        {
                            detail = $"{detail} [{sc.GetString()}]";
                        }
                        return true;
                    }
                }
            }
        }
        catch
        {
            // Not valid JSON — treat as unparsed and let the caller rethrow.
        }
        return false;
    }

    private static CardPaymentIntentResult NormalizeIntentResponse(string intentId, JsonElement attrs)
    {
        var status = attrs.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.String
            ? st.GetString() ?? string.Empty
            : string.Empty;

        string? redirectUrl = null;
        if (status.Equals("awaiting_next_action", StringComparison.OrdinalIgnoreCase) &&
            attrs.TryGetProperty("next_action", out var na) && na.ValueKind == JsonValueKind.Object &&
            na.TryGetProperty("redirect", out var redir) && redir.ValueKind == JsonValueKind.Object &&
            redir.TryGetProperty("url", out var url) && url.ValueKind == JsonValueKind.String)
        {
            redirectUrl = url.GetString();
        }

        string? failureReason = null;
        if (attrs.TryGetProperty("last_payment_error", out var lpe))
        {
            if (lpe.ValueKind == JsonValueKind.String)
                failureReason = lpe.GetString();
            else if (lpe.ValueKind == JsonValueKind.Object &&
                     lpe.TryGetProperty("message", out var msg) && msg.ValueKind == JsonValueKind.String)
                failureReason = msg.GetString();
        }

        var amountPesos = 0m;
        if (attrs.TryGetProperty("amount", out var amt) &&
            amt.TryGetInt64(out var cents))
        {
            amountPesos = cents / 100m;
        }

        string? bookingRef = null;
        if (attrs.TryGetProperty("metadata", out var meta) && meta.ValueKind == JsonValueKind.Object &&
            meta.TryGetProperty("booking_reference", out var br) && br.ValueKind == JsonValueKind.String)
        {
            bookingRef = br.GetString();
        }

        return new CardPaymentIntentResult(
            intentId,
            string.Empty,
            NormalizeIntentStatus(status),
            redirectUrl,
            failureReason,
            amountPesos,
            string.IsNullOrWhiteSpace(bookingRef) ? null : bookingRef);
    }

    private static string NormalizeIntentStatus(string raw) => raw.ToLowerInvariant() switch
    {
        "succeeded" => "succeeded",
        "failed" => "failed",
        "awaiting_next_action" => "awaiting_next_action",
        "awaiting_payment_method" => "awaiting_payment_method",
        "processing" => "processing",
        "canceled" => "canceled",
        _ => "awaiting_payment_method"
    };

    private static bool FixedTimeEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var result = 0;
        for (var i = 0; i < a.Length; i++)
            result |= a[i] ^ b[i];
        return result == 0;
    }
}
