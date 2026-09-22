using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Tests;

public class PaymentsControllerCardTests
{
    private static PayMongoOptions Options => new()
    {
        SecretKey = "sk_test_x",
        PublicKey = "pk_test_x",
        ApiBaseUrl = "https://api.paymongo.com",
        WebhookSecretKey = "whsec_x"
    };

    private static PaymentsController Controller(TravelConnectDbContext db, FakePayMongoHandler handler) =>
        new(db, new PayMongoService(new HttpClient(handler), Options), Options);

    private const string SuccessIntent =
        """{ "data": { "id": "pi_success", "attributes": { "status": "succeeded", "amount": 1200000, "metadata": { "booking_reference": "REF-C1" } } } }""";

    [Fact]
    public async Task CreateCardIntent_validates_amount_before_calling_paymongo()
    {
        var handler = new FakePayMongoHandler(_ => SuccessIntent);
        var controller = Controller(TestDb.Create(), handler);

        var zero = await controller.CreateCardIntent(new PaymentsController.CardIntentRequest(0));
        Assert.IsType<BadRequestObjectResult>(zero);

        var tiny = await controller.CreateCardIntent(new PaymentsController.CardIntentRequest(5));
        Assert.IsType<BadRequestObjectResult>(tiny);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task CreateCardIntent_returns_intent_when_paymongo_creates_it()
    {
        var handler = new FakePayMongoHandler(_ =>
            """{ "data": { "id": "pi_new", "attributes": { "status": "awaiting_payment_method", "client_key": "ck" } } }""");
        var controller = Controller(TestDb.Create(), handler);

        var result = await controller.CreateCardIntent(
            new PaymentsController.CardIntentRequest(12000m, "REF-C1"));

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = TestDb.ToJson(ok.Value);
        Assert.Equal("pi_new", body.GetProperty("intentId").GetString());
        Assert.Equal("awaiting_payment_method", body.GetProperty("status").GetString());
    }

    [Fact]
    public async Task AttachCard_rejects_invalid_card_before_touching_paymongo()
    {
        var handler = new FakePayMongoHandler(_ => SuccessIntent);
        var controller = Controller(TestDb.Create(), handler);

        var badNumber = await controller.AttachCard(new PaymentsController.CardAttachRequest(
            "pi_x", "4242424242424241", 12, 2028, "123"));
        Assert.IsType<BadRequestObjectResult>(badNumber);

        var pastExpiry = await controller.AttachCard(new PaymentsController.CardAttachRequest(
            "pi_x", "4242424242424242", 1, 2020, "123"));
        Assert.IsType<BadRequestObjectResult>(pastExpiry);

        var badCvc = await controller.AttachCard(new PaymentsController.CardAttachRequest(
            "pi_x", "4242424242424242", 12, 2028, "12a"));
        Assert.IsType<BadRequestObjectResult>(badCvc);

        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task AttachCard_rejects_malformed_customer_email()
    {
        var handler = new FakePayMongoHandler(_ => SuccessIntent);
        var controller = Controller(TestDb.Create(), handler);

        var badEmail = await controller.AttachCard(new PaymentsController.CardAttachRequest(
            "pi_x", "4343434343434345", 12, 2028, "123", "Juan D.", null, "not-an-email"));
        Assert.IsType<BadRequestObjectResult>(badEmail);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task AttachCard_surfaces_a_decline_as_a_friendly_failure()
    {
        // PayMongo answers the attach call with a 400 + machine-readable error.
        var handler = new FakePayMongoHandler(
            request => request.RequestUri!.PathAndQuery.EndsWith("/attach")
                ? """{"errors":[{"code":"resource_failed_state","detail":"The card has insufficient funds to complete the purchase.","sub_code":"insufficient_funds"}]}"""
                : """{ "data": { "id": "pm_ok" } }""",
            request => request.RequestUri!.PathAndQuery.EndsWith("/attach") ? 400 : 200);
        var controller = Controller(TestDb.Create(), handler);

        var result = await controller.AttachCard(new PaymentsController.CardAttachRequest(
            "pi_x", "5100000000000198", 12, 2028, "123", "Juan D.", null, "juan@tc.com"));

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = TestDb.ToJson(ok.Value);
        Assert.Equal("failed", body.GetProperty("status").GetString());
        Assert.Contains("insufficient funds", body.GetProperty("failureReason").GetString());
    }

    [Fact]
    public async Task AttachCard_rejects_before_tokenization_with_a_clean_message()
    {
        var handler = new FakePayMongoHandler(
            _ => """{"errors":[{"code":"livemode_mismatched","detail":"Please use PayMongo test cards only.","source":{"attribute":"card_number"}}]}""",
            _ => 400);
        var controller = Controller(TestDb.Create(), handler);

        var result = await controller.AttachCard(new PaymentsController.CardAttachRequest(
            "pi_x", "4242424242424242", 12, 2028, "123"));

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        var body = TestDb.ToJson(bad.Value);
        Assert.Contains("test cards only", body.GetProperty("message").GetString());
        Assert.DoesNotContain("errors", body.GetProperty("message").GetString());
    }

    [Fact]
    public async Task AttachCard_returns_3ds_redirect_for_awaiting_next_action()
    {
        var handler = new FakePayMongoHandler(_ => """
{ "data": { "id": "pi_3ds", "attributes": {
    "status": "awaiting_next_action",
    "next_action": { "type": "redirect", "redirect": { "url": "https://3ds.test?token=abc" } }
} } }
""");
        var controller = Controller(TestDb.Create(), handler);

        var result = await controller.AttachCard(new PaymentsController.CardAttachRequest(
            "pi_3ds", "4343434343434345", 12, 2028, "123", "Juan D.", null, "juan@tc.com"));

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = TestDb.ToJson(ok.Value);
        Assert.Equal("awaiting_next_action", body.GetProperty("status").GetString());
        Assert.Equal("https://3ds.test?token=abc",
            body.GetProperty("nextAction").GetProperty("redirectUrl").GetString());
        Assert.Equal("Visa", body.GetProperty("cardBrand").GetString());
    }

    [Fact]
    public async Task Poll_records_payment_and_marks_booking_paid_when_succeeded()
    {
        using var db = TestDb.Create();
        db.Bookings.Add(new Booking
        {
            ReferenceNumber = "REF-C1",
            PackageName = "REF-C1",
            CustomerName = "Juan D.",
            CustomerEmail = "juan@tc.com",
            Status = "upcoming",
            Paid = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var handler = new FakePayMongoHandler(_ => SuccessIntent);
        var controller = Controller(db, handler);
        _ = controller; // (controller is stateless for this call)

        var result = await controller.GetCardIntentStatus("pi_success");

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = TestDb.ToJson(ok.Value);
        Assert.Equal("paid", body.GetProperty("status").GetString());
        Assert.Equal("pi_success", body.GetProperty("paymentId").GetString());

        var payment = await db.Payments.SingleAsync();
        Assert.Equal("pi_success", payment.ReferenceId);
        Assert.Equal("card", payment.Method);
        Assert.Equal("Paid", payment.Status);
        Assert.Equal(12000m, payment.Amount);
        Assert.Equal("Juan D.", payment.CustomerName);

        var booking = await db.Bookings.SingleAsync();
        Assert.True(booking.Paid);
        Assert.Equal("pi_success", booking.TransactionId);
    }

    [Fact]
    public async Task Poll_is_idempotent_never_duplicates_payment_rows()
    {
        using var db = TestDb.Create();
        var handler = new FakePayMongoHandler(_ => SuccessIntent);
        var controller = Controller(db, handler);

        await controller.GetCardIntentStatus("pi_success");
        await controller.GetCardIntentStatus("pi_success");

        Assert.Single(await db.Payments.ToListAsync());
    }

    [Fact]
    public async Task Poll_does_not_record_until_succeeded()
    {
        using var db = TestDb.Create();
        var handler = new FakePayMongoHandler(_ => """
{ "data": { "id": "pi_wait", "attributes": { "status": "awaiting_next_action" } } }
""");
        var controller = Controller(db, handler);

        var result = await controller.GetCardIntentStatus("pi_wait");

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = TestDb.ToJson(ok.Value);
        Assert.Equal("awaiting_next_action", body.GetProperty("status").GetString());
        Assert.Empty(await db.Payments.ToListAsync());
    }

    [Fact]
    public async Task Poll_surfaces_decline_reason_without_recording()
    {
        using var db = TestDb.Create();
        var handler = new FakePayMongoHandler(_ => """
{ "data": { "id": "pi_declined", "attributes": { "status": "failed",
    "last_payment_error": { "message": "Card was declined." } } } }
""");
        var controller = Controller(db, handler);

        var result = await controller.GetCardIntentStatus("pi_declined");

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = TestDb.ToJson(ok.Value);
        Assert.Equal("failed", body.GetProperty("status").GetString());
        Assert.Equal("Card was declined.", body.GetProperty("failureReason").GetString());
        Assert.Empty(await db.Payments.ToListAsync());
    }
}