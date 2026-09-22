using System.Net;
using System.Net.Http;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

public class PayMongoServiceCardTests
{
    [Theory]
    [InlineData("sk_test_x", "pk_test_x")]
    [InlineData("", "")]
    public void GuardTestMode_accepts_test_or_unset_keys(string secret, string pub)
    {
        var options = new PayMongoOptions { SecretKey = secret, PublicKey = pub, Mode = "test" };

        PayMongoService.GuardTestMode(options); // must not throw
    }

    [Fact]
    public void GuardTestMode_refuses_live_keys_while_mode_is_test()
    {
        var options = new PayMongoOptions
        {
            SecretKey = "sk_live_abcdef",
            PublicKey = "pk_test_x",
            Mode = "test"
        };

        var ex = Assert.Throws<InvalidOperationException>(() => PayMongoService.GuardTestMode(options));
        Assert.Contains("TEST-MODE ONLY", ex.Message);
    }

    [Fact]
    public void GuardTestMode_can_opt_into_live_explicitly()
    {
        var options = new PayMongoOptions
        {
            SecretKey = "sk_live_abcdef",
            PublicKey = "pk_live_abcdef",
            Mode = "live"
        };

        PayMongoService.GuardTestMode(options); // must not throw
    }

    private static PayMongoService Service(FakePayMongoHandler handler)
    {
        var options = new PayMongoOptions
        {
            SecretKey = "sk_test_x",
            PublicKey = "pk_test_x",
            ApiBaseUrl = "https://api.paymongo.com",
            WebhookSecretKey = "whsec_x"
        };
        return new PayMongoService(new HttpClient(handler), options);
    }

    private const string IntentJson = /*lang=json,strict*/ """
{
  "data": {
    "id": "pi_testIntent1",
    "attributes": {
      "amount": 1250000,
      "currency": "PHP",
      "status": "awaiting_payment_method",
      "client_key": "ck_test_intent1"
    }
  }
}
""";

    [Fact]
    public async Task CreateCardPaymentIntent_posts_card_intent_with_3ds_and_returns_id_clientkey()
    {
        var handler = new FakePayMongoHandler(_ => IntentJson);
        var service = Service(handler);

        var result = await service.CreateCardPaymentIntentAsync(
            1_250_000, "TravelConnect booking REF-1", "https://tc.app/payment-result", "REF-1");

        Assert.Equal("pi_testIntent1", result.IntentId);
        Assert.Equal("ck_test_intent1", result.ClientKey);
        Assert.Equal("awaiting_payment_method", result.Status);

        var request = handler.Requests.Single(r => r.RequestUri!.PathAndQuery == "/v1/payment_intents");
        Assert.NotNull(request);
        Assert.NotEmpty(FakePayMongoHandler.BasicKeyOf(request));

        var allowed = FakePayMongoHandler.AttributesOf(request, "payment_method_allowed");
        Assert.Equal("card", allowed.EnumerateArray().Single().GetString());

        var options = FakePayMongoHandler.AttributesOf(request, "payment_method_options");
        Assert.Equal("any",
            options.GetProperty("card").GetProperty("request_three_d_secure").GetString());

        var attrs = FakePayMongoHandler.PayloadRoot(request).GetProperty("data").GetProperty("attributes");
        Assert.Equal(1_250_000L, attrs.GetProperty("amount").GetInt64());
        Assert.Equal("https://tc.app/payment-result", attrs.GetProperty("return_url").GetString());
        Assert.Equal("REF-1",
            attrs.GetProperty("metadata").GetProperty("booking_reference").GetString());
    }

    [Fact]
    public async Task AttachCard_posts_payment_method_then_attach_and_parses_3ds_redirect()
    {
        var handler = new FakePayMongoHandler(request =>
        {
            if (request.RequestUri!.PathAndQuery == "/v1/payment_methods")
            {
                return """{ "data": { "id": "pm_testCard1", "type": "payment_method" } }""";
            }
            return """
{
  "data": {
    "id": "pi_testIntent1",
    "attributes": {
      "status": "awaiting_next_action",
      "next_action": { "type": "redirect", "redirect": { "url": "https://3ds.test/verify?token=abc" } }
    }
  }
}
""";
        });
        var service = Service(handler);

        var result = await service.AttachCardToPaymentIntentAsync(
            "pi_testIntent1",
            new CardDetails("4343434343434345", 12, 2028, "123", "Juan D.", "juan@tc.com"));

        Assert.Equal("awaiting_next_action", result.Status);
        Assert.Equal("https://3ds.test/verify?token=abc", result.RedirectUrl);

        var pmRequest = handler.Requests.Single(r => r.RequestUri!.PathAndQuery == "/v1/payment_methods");
        var pmDetails = FakePayMongoHandler.AttributesOf(pmRequest, "details");
        Assert.Equal("4343434343434345", pmDetails.GetProperty("card_number").GetString());
        Assert.Equal(12, pmDetails.GetProperty("exp_month").GetInt32());
        Assert.Equal("2028", pmDetails.GetProperty("exp_year").GetInt32().ToString());
        Assert.Equal("123", pmDetails.GetProperty("cvc").GetString());

        var billing = FakePayMongoHandler.AttributesOf(pmRequest, "billing");
        Assert.Equal("juan@tc.com", billing.GetProperty("email").GetString());
        Assert.Equal("Juan D.", billing.GetProperty("name").GetString());

        var attachRequest = handler.Requests.Single(r =>
            r.RequestUri!.PathAndQuery == "/v1/payment_intents/pi_testIntent1/attach");
        Assert.Equal("pm_testCard1",
            FakePayMongoHandler.AttributesOf(attachRequest, "payment_method").GetString());
    }

    [Fact]
    public async Task GetCardIntent_normalizes_success_with_amount_and_booking_metadata()
    {
        var handler = new FakePayMongoHandler(_ => """
{
  "data": {
    "id": "pi_testIntent1",
    "attributes": {
      "status": "succeeded",
      "amount": 1200000,
      "metadata": { "booking_reference": "REF-9" }
    }
  }
}
""");
        var service = Service(handler);

        var result = await service.GetCardPaymentIntentAsync("pi_testIntent1");

        Assert.Equal("succeeded", result.Status);
        Assert.Equal(12000m, result.AmountPesos);
        Assert.Equal("REF-9", result.BookingReference);
    }

    [Fact]
    public async Task GetCardIntent_normalizes_failure_with_reason()
    {
        var handler = new FakePayMongoHandler(_ => """
{
  "data": {
    "id": "pi_testIntent1",
    "attributes": {
      "status": "failed",
      "last_payment_error": { "message": "Card was declined." }
    }
  }
}
""");
        var service = Service(handler);

        var result = await service.GetCardPaymentIntentAsync("pi_testIntent1");

        Assert.Equal("failed", result.Status);
        Assert.Equal("Card was declined.", result.FailureReason);
    }
}