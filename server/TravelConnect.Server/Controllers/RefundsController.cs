using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

/// <summary>
/// The finance payout queue. Everything under /api/admin/refunds moves real money,
/// so every action is gated on <see cref="StaffActor.CanManageRefunds"/> and every
/// status change goes through <see cref="RefundProcessingService"/>'s transition guard.
/// </summary>
[ApiController]
[Authorize]
[Route("api/admin/refunds")]
public class RefundsController(
    RefundProcessingService refunds,
    StaffContextService staff) : ControllerBase
{
    // GET api/admin/refunds?status=&search=&page=&pageSize=
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int? page,
        [FromQuery] int? pageSize)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanView) return Forbid();

        try
        {
            var result = await refunds.ListAsync(status, search, page ?? 1, pageSize ?? 25);

            return Ok(new
            {
                items = result.Items.Select(Summarise).ToList(),
                total = result.Total,
                page = result.Page,
                pageSize = result.PageSize,
                canProcess = actor.CanManageRefunds,
            });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // GET api/admin/refunds/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Detail(int id)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanView) return Forbid();

        var refund = await refunds.GetAsync(id);
        if (refund is null) return NotFound(new { message = "Refund not found" });

        return Ok(new
        {
            refund = Summarise(refund),
            refund.Notes,
            refund.FailureReason,
            allowedTransitions = RefundStatuses.AllowedTransitions(refund.Status),
            canProcess = actor.CanManageRefunds,
            booking = refund.Booking is null
                ? null
                : new
                {
                    refund.Booking.Id,
                    refund.Booking.ReferenceNumber,
                    refund.Booking.Status,
                    refund.Booking.CancellationStatus,
                    refund.Booking.RefundStatus,
                    refund.Booking.Paid,
                    refund.Booking.TotalAmount,
                    refund.Booking.PaymentMethod,
                    refund.Booking.StartDate,
                },
            cancellation = refund.Cancellation is null
                ? null
                : new
                {
                    refund.Cancellation.Id,
                    refund.Cancellation.Reference,
                    refund.Cancellation.Status,
                    refund.Cancellation.PolicyName,
                    refund.Cancellation.Resolution,
                    refund.Cancellation.RefundAmount,
                    refund.Cancellation.TotalFees,
                },
            payment = refund.Payment is null
                ? null
                : new
                {
                    refund.Payment.Id,
                    refund.Payment.ReferenceId,
                    refund.Payment.Method,
                    refund.Payment.Amount,
                    refund.Payment.Status,
                    refund.Payment.PaymentDate,
                },
        });
    }

    // POST api/admin/refunds/{id}/release  — finance approves the payout
    [HttpPost("{id:int}/release")]
    public async Task<IActionResult> Release(int id, [FromBody] RefundActionRequest? request)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanManageRefunds) return Forbid();

        try
        {
            var result = await refunds.ReleaseAsync(id, actor, request?.Notes);
            return Ok(Respond(result));
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Refund not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    // POST api/admin/refunds/{id}/process  — money sent, awaiting confirmation
    [HttpPost("{id:int}/process")]
    public async Task<IActionResult> Process(int id, [FromBody] RefundActionRequest? request)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanManageRefunds) return Forbid();

        try
        {
            var result = await refunds.StartAsync(id, actor, request?.RefundReference, request?.Notes);
            return Ok(Respond(result));
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Refund not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    // POST api/admin/refunds/{id}/complete  — the money reached the customer
    [HttpPost("{id:int}/complete")]
    public async Task<IActionResult> Complete(int id, [FromBody] RefundActionRequest? request)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanManageRefunds) return Forbid();

        try
        {
            var result = await refunds.CompleteAsync(id, actor, request?.RefundReference, request?.Notes);
            return Ok(Respond(result));
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Refund not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    // POST api/admin/refunds/{id}/fail
    [HttpPost("{id:int}/fail")]
    public async Task<IActionResult> Fail(int id, [FromBody] RefundActionRequest? request)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanManageRefunds) return Forbid();

        try
        {
            var result = await refunds.FailAsync(id, actor, request?.Reason ?? string.Empty, request?.Notes);
            return Ok(Respond(result));
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Refund not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    // POST api/admin/refunds/{id}/retry
    [HttpPost("{id:int}/retry")]
    public async Task<IActionResult> Retry(int id, [FromBody] RefundActionRequest? request)
    {
        var actor = await staff.ResolveAsync(User);
        if (!actor.CanManageRefunds) return Forbid();

        try
        {
            var result = await refunds.RetryAsync(id, actor, request?.Notes);
            return Ok(Respond(result));
        }
        catch (KeyNotFoundException) { return NotFound(new { message = "Refund not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    private static object Respond(RefundActionResult result) => new
    {
        success = true,
        message = result.Message,
        refund = Summarise(result.Refund),
        result.Refund.Notes,
        result.Refund.FailureReason,
        bookingStatus = result.Booking.Status,
        cancellationStatus = result.Cancellation?.Status,
    };

    private static object Summarise(BookingRefund r) => new
    {
        r.Id,
        r.Reference,
        r.CancellationId,
        r.BookingId,
        r.PaymentId,
        r.Status,
        r.CreatedAt,
        r.Method,
        r.Amount,
        r.CalculatedAmount,
        r.OriginalAmount,
        r.TotalDeductions,
        r.IsAdjusted,
        r.RefundReference,
        r.RequestedBy,
        r.ApprovedBy,
        r.ApprovedAt,
        r.ProcessedAt,
        r.CompletedAt,
        r.FailureReason,
        customerName = r.Cancellation?.CustomerName,
        customerEmail = r.Cancellation?.CustomerEmail,
        bookingReference = r.Booking?.ReferenceNumber,
        allowedTransitions = RefundStatuses.AllowedTransitions(r.Status),
    };
}

public class RefundActionRequest
{
    public string? RefundReference { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}
