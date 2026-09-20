using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace TravelConnect.Server.Services;

public class EmailJsOptions
{
    public string ServiceId { get; set; } = string.Empty;
    public string TemplateId { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    // Optional private key; only used as the REST accessToken when present.
    // Kept out of appsettings.json so production secrets stay in env vars.
    public string PrivateKey { get; set; } = string.Empty;
}

/// <summary>
/// Server-side EmailJS sender. Tier inquiries used to fire EmailJS straight
/// from the browser (unrestricted spam surface). Now the browser posts to a
/// rate-limited backend endpoint and THIS service calls the EmailJS REST API,
/// so repeated submits from one IP get throttled before an email is sent.
/// </summary>
public class EmailJsService
{
    private const string SendUrl = "https://api.emailjs.com/api/v1.0/email/send";

    private readonly EmailJsOptions _options;
    private readonly HttpClient _http;

    public EmailJsService(IOptions<EmailJsOptions> options, HttpClient http)
    {
        _options = options.Value;
        _http = http;
    }

    /// <summary>
    /// Sends the "new tier inquiry" admin notification email. Fire-and-forget:
    /// returns false (never throws) so a failed email can't break the inquiry
    /// record that was already saved.
    /// </summary>
    public async Task<bool> SendInquiryNotificationAsync(
        string name, string email, string time, string message,
        string tier, string planName)
    {
        if (string.IsNullOrWhiteSpace(_options.ServiceId) ||
            string.IsNullOrWhiteSpace(_options.TemplateId) ||
            string.IsNullOrWhiteSpace(_options.PublicKey))
        {
            return false;
        }

        var payload = new Dictionary<string, object?>
        {
            ["service_id"] = _options.ServiceId,
            ["template_id"] = _options.TemplateId,
            ["user_id"] = _options.PublicKey,
            ["template_params"] = new Dictionary<string, object?>
            {
                ["name"] = name,
                ["email"] = email,
                ["time"] = time,
                ["message"] = message,
                ["tier"] = tier,
                ["plan_name"] = planName,
                ["to_name"] = "TravelConnect Team"
            }
        };

        if (!string.IsNullOrWhiteSpace(_options.PrivateKey))
            payload["accessToken"] = _options.PrivateKey;

        using var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        try
        {
            using var response = await _http.PostAsync(SendUrl, content);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}