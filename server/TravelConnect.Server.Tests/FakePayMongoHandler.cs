using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Scriptable HTTP handler that returns canned PayMongo JSON per endpoint so
/// PayMongoService can be tested without the real API.
/// </summary>
public sealed class FakePayMongoHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, string> _responder;
    private readonly Func<HttpRequestMessage, int>? _statusCode;

    public FakePayMongoHandler(
        Func<HttpRequestMessage, string> responder,
        Func<HttpRequestMessage, int>? statusCode = null)
    {
        _responder = responder;
        _statusCode = statusCode;
    }

    public List<HttpRequestMessage> Requests { get; } = new();

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Requests.Add(request);
        var body = _responder(request) ?? "{}";
        var status = _statusCode?.Invoke(request) ?? (int)HttpStatusCode.OK;
        return Task.FromResult(new HttpResponseMessage((HttpStatusCode)status)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        });
    }

    public static JsonElement AttributesOf(HttpRequestMessage request, string property) =>
        PayloadRoot(request).GetProperty("data").GetProperty("attributes").GetProperty(property).Clone();

    public static JsonElement PayloadRoot(HttpRequestMessage request)
    {
        var content = request.Content?.ReadAsStringAsync().GetAwaiter().GetResult() ?? "{}";
        return JsonDocument.Parse(content).RootElement.Clone();
    }

    public static string ReadBody(HttpRequestMessage request) =>
        request.Content?.ReadAsStringAsync().GetAwaiter().GetResult() ?? string.Empty;

    public static string BasicKeyOf(HttpRequestMessage request)
    {
        var raw = request.Headers.Authorization?.Parameter ?? "";
        var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(raw));
        return decoded.TrimEnd(':');
    }
}