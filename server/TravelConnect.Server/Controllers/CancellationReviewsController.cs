using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

public class ApproveCancellationRequest
{
    public string? Notes { get; set; }
    // Staff may switch how the money is returned, and (with the override
    // permission) correct the amount. Both are recorded as an exception.
    public string? Resolution { get; set; }
    public decimal? RefundAmount { get; set; }
}

public class RejectCancellationRequest
{
    public string? Reason { get; set; }
}

/// <summary>
/// The staff review queue. Reading it needs any staff role that supports
/// cancellations; deciding one needs the approval permission, enforced here
/// against the SystemUser role rather than anything in the request body.
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/cancellations")]
public class CancellationReviewsController(
    CancellationReviewService reviews,
    StaffContextService staff) : ControllerBase
{
    // GET api/admin/cancellations?status=pending&search=&page=&pageSize=
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int? page,
        [FromQuery] int? pageSize)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanView) return Forbid();

        var result = await reviews.ListAsync(status, search, page ?? 1, pageSize ?? 25);

        return Ok(new
        {
            items = result.Items.Select(Summarise).ToList(),
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            canApprove = actor.CanApproveCancellation,
            canOverrideAmount = actor.CanOverrideRefundAmount,
        });
    }

    // GET api/admin/cancellations/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Detail(int id)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanView) return Forbid();

        var cancellation = await reviews.GetAsync(id);
        if (cancellation is null) return NotFound(new { message = "Cancellation request not found" });

        return Ok(new
        {
            cancellation = Summarise(cancellation),
            notes = cancellation.Notes,
            rejectionReason = cancellation.RejectionReason,
            canApprove = actor.CanApproveCancellation,
            canOverrideAmount = actor.CanOverrideRefundAmount,
            booking = cancellation.Booking is null
                ? null
                : new
                {
                    id = cancellation.Booking.Id,
                    referenceNumber = cancellation.Booking.ReferenceNumber,
                    status = cancellation.Booking.Status,
                    packageName = cancellation.Booking.PackageName,
                    startDate = cancellation.Booking.StartDate,
                    totalAmount = cancellation.Booking.TotalAmount,
                    paymentMethod = cancellation.Booking.PaymentMethod,
                    paid = cancellation.Booking.Paid,
                },
            refunds = cancellation.Refunds.Select(r => new
            {
                r.Id,
                r.Reference,
                r.Status,
                r.Method,
                r.Amount,
                r.Notes,
                r.RequestedBy,
                r.CreatedAt,
            }).ToList(),
        });
    }

    // POST api/admin/cancellations/{id}/approve
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, [FromBody] ApproveCancellationRequest? request)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanApproveCancellation) return Forbid();

        try
        {
            var decision = await reviews.ApproveAsync(
                id,
                actor,
                request?.Notes,
                request?.Resolution,
                request?.RefundAmount);

            return Ok(new
            {
                success = true,
                message = decision.Message,
                cancellation = Summarise(decision.Cancellation),
                refund = decision.Refund is null
                    ? null
                    : new
                    {
                        decision.Refund.Reference,
                        decision.Refund.Status,
                        decision.Refund.Method,
                        decision.Refund.Amount,
                    },
                bookingStatus = decision.Booking?.Status,
            });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Cancellation request not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    // POST api/admin/cancellations/{id}/reject
    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectCancellationRequest? request)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanApproveCancellation) return Forbid();

        try
        {
            var decision = await reviews.RejectAsync(id, actor, request?.Reason ?? string.Empty);

            return Ok(new
            {
                success = true,
                message = decision.Message,
                cancellation = Summarise(decision.Cancellation),
                bookingStatus = decision.Booking?.Status,
            });
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Cancellation request not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    private static object Summarise(BookingCancellation c) => new
    {
        c.Id,
        c.Reference,
        c.BookingId,
        c.CustomerName,
        c.CustomerEmail,
        c.Status,
        c.ReasonCode,
        c.Reason,
        c.RequestedAt,
        c.DecidedAt,
        c.ApprovedBy,
        c.RejectionReason,
        c.PolicyTier,
        c.PolicyName,
        c.FareType,
        c.RefundPercentage,
        c.RequiresApproval,
        c.AutoApproved,
        c.IsException,
        c.Resolution,
        c.OriginalAmount,
        c.TotalFees,
        c.RefundableAmount,
        c.RefundAmount,
        c.HoursBeforeDeparture,
        c.HoursSinceBooking,
        c.PastDeparture,
    };
}
