using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

public class CancellationRequest
{
    public string? ReasonCode { get; set; }
    public string? Reason { get; set; }
    // Proof of ownership for callers who are not signed in: the booking's
    // reference number plus the email it was made with.
    public string? ReferenceNumber { get; set; }
    public string? CustomerEmail { get; set; }
}

/// <summary>
/// The customer side of a cancellation: quote it, then request it. Both
/// endpoints are anonymous (a customer can hold a booking without an account) so
/// ownership is proven instead — a signed-in caller must match the booking email,
/// an anonymous one must supply the exact reference number and email together.
/// Every number is recalculated server-side; the client cannot post an amount.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/bookings/{id:int}")]
public class CancellationsController(
    TravelConnectDbContext db,
    CancellationQuoteService quotes,
    CancellationPolicyService policy) : ControllerBase
{
    // GET api/bookings/{id}/cancellation-quote
    [HttpGet("cancellation-quote")]
    public async Task<IActionResult> Quote(int id, [FromQuery] string? referenceNumber, [FromQuery] string? email)
    {
        var booking = await LoadAsync(id);
        if (booking is null) return NotFound(new { message = "Booking not found" });
        if (!Owns(booking, referenceNumber, email)) return Forbid();

        var (quote, _) = await quotes.MatchAsync(booking);
        var live = await quotes.LiveCancellationAsync(id);

        return Ok(Present(booking, quote, live));
    }

    // POST api/bookings/{id}/cancellation-requests
    [HttpPost("cancellation-requests")]
    [EnableRateLimiting("anonymous-write")]
    public async Task<IActionResult> SubmitRequest(int id, [FromBody] CancellationRequest request)
    {
        if (request is null) return BadRequest(new { message = "A cancellation reason is required" });

        var booking = await LoadAsync(id);
        if (booking is null) return NotFound(new { message = "Booking not found" });
        if (!Owns(booking, request.ReferenceNumber, request.CustomerEmail)) return Forbid();

        if (CancellationQuoteService.IsTerminalBookingStatus(booking.Status))
            return BadRequest(new { message = "This booking has already been cancelled or refunded" });

        if (await quotes.LiveCancellationAsync(id) is not null)
            return Conflict(new { message = "A cancellation request for this booking is already in progress" });

        // The policy may require a reason; when it does, an empty one is refused
        // instead of silently refunding a customer who told us nothing.
        if (await RequiresReasonAsync() &&
            string.IsNullOrWhiteSpace(request.Reason) &&
            string.IsNullOrWhiteSpace(request.ReasonCode))
        {
            return BadRequest(new { message = "Please tell us why you are cancelling" });
        }

        var actor = Actor();
        var (cancellation, refund, message) = await quotes.RequestAsync(
            booking,
            request.ReasonCode ?? "unspecified",
            request.Reason ?? string.Empty,
            actor);

        return Ok(new
        {
            success = true,
            message,
            cancellation,
            refund,
            bookingStatus = booking.Status,
            cancellationStatus = booking.CancellationStatus,
        });
    }

    // GET api/bookings/{id}/cancellation
    [HttpGet("cancellation")]
    public async Task<IActionResult> Status(int id, [FromQuery] string? referenceNumber, [FromQuery] string? email)
    {
        var booking = await LoadAsync(id);
        if (booking is null) return NotFound(new { message = "Booking not found" });
        if (!Owns(booking, referenceNumber, email)) return Forbid();

        var live = await quotes.LiveCancellationAsync(id)
            ?? await db.BookingCancellations
                .Where(c => c.BookingId == id)
                .OrderByDescending(c => c.Id)
                .FirstOrDefaultAsync();

        if (live is null)
            return Ok(new { bookingStatus = booking.Status, cancellation = (object?)null, refund = (object?)null });

        var refund = await db.BookingRefunds
            .Where(r => r.CancellationId == live.Id)
            .OrderByDescending(r => r.Id)
            .FirstOrDefaultAsync();

        return Ok(new { bookingStatus = booking.Status, cancellation = live, refund });
    }

    private async Task<Booking?> LoadAsync(int id) =>
        await db.Bookings
            .Include(b => b.BookingFlights)
            .FirstOrDefaultAsync(b => b.Id == id);

    private async Task<bool> RequiresReasonAsync()
    {
        var settings = await policy.GetActiveSettingsAsync();
        return settings.RequireCancellationReason;
    }

    /// <summary>
    /// A signed-in caller must be the customer on the booking. An anonymous
    /// caller must present the exact reference number and email — the same proof
    /// the public booking lookup uses. Staff are allowed through so the admin
    /// tools can inspect a booking.
    /// </summary>
    private bool Owns(Booking booking, string? referenceNumber, string? email)
    {
        var token = User.Identity?.IsAuthenticated == true ? StaffContextService.Email(User) : null;
        var isStaff = !string.IsNullOrWhiteSpace(token) && IsStaffEmail(token);
        return BookingOwnership.Authorise(booking, token, isStaff, referenceNumber, email);
    }

    private bool IsStaffEmail(string email) =>
        db.SystemUsers.Any(u => u.Email.ToLower() == email.ToLower() && u.Status == "Active");

    private string Actor()
    {
        var email = StaffContextService.Email(User);
        if (!string.IsNullOrWhiteSpace(email)) return email;
        return "anonymous";
    }

    private static object Present(Booking booking, RefundQuote quote, BookingCancellation? live) => new
    {
        bookingId = booking.Id,
        referenceNumber = booking.ReferenceNumber,
        bookingStatus = booking.Status,
        totalAmount = quote.OriginalAmount,
        quote,
        requiresApproval = quote.RequiresApproval,
        isRefundable = quote.IsRefundable,
        liveCancellation = live is null
            ? null
            : new
            {
                id = live.Id,
                reference = live.Reference,
                status = live.Status,
                reasonCode = live.ReasonCode,
                reason = live.Reason,
                requestedAt = live.RequestedAt,
                refundAmount = live.RefundAmount,
                resolution = live.Resolution,
                requiresApproval = live.RequiresApproval,
                autoApproved = live.AutoApproved,
            }
    };
}
