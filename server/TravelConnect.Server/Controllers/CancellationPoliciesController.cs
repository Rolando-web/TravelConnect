using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using TravelConnect.Server.Services;

namespace TravelConnect.Server.Controllers;

/// <summary>
/// Administrator-configurable cancellation &amp; refund policy: the grace
/// period, the refund percentage per tier, every fee the agency deducts, which
/// situations need manual approval, and the non-refundable / no-show rules.
/// Nothing here is hard-coded in the refund engine — the engine reads whatever
/// this controller stores.
/// </summary>
[ApiController]
[Authorize]
[Route("api/cancellation-policies")]
public class CancellationPoliciesController(
    TravelConnectDbContext db,
    CancellationPolicyService policyService,
    StaffContextService staffContext) : ControllerBase
{
    // GET api/cancellation-policies
    [HttpGet]
    public async Task<IActionResult> GetPolicy()
    {
        var actor = await staffContext.ResolveAsync(User);
        if (!actor.CanView) return Forbid();

        var settings = await policyService.GetActiveSettingsAsync();
        var rules = await db.CancellationPolicyRules
            .AsNoTracking()
            .OrderBy(r => r.PolicyTier)
            .ThenByDescending(r => r.Priority)
            .ToListAsync();

        return Ok(new
        {
            settings,
            rules,
            tiers = PolicyTiers.All.Select(t => new { key = t, label = PolicyTiers.Label(t) }),
            fareTypes = FareTypes.All,
            resolutions = new[] { RefundResolutions.Cash, RefundResolutions.TravelCredit, RefundResolutions.None },
            canManage = actor.CanManagePolicy,
            canOverrideAmount = actor.CanOverrideRefundAmount
        });
    }

    // PUT api/cancellation-policies/settings
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(CancellationPolicySettings request)
    {
        var actor = await staffContext.ResolveAsync(User);
        if (!actor.CanManagePolicy) return Forbid();

        if (request.GracePeriodHours < 0)
            return BadRequest(new { message = "Grace period cannot be negative" });
        if (request.MaxRefundOverridePercent is < 0 or > 100)
            return BadRequest(new { message = "Maximum override percent must be between 0 and 100" });
        if (request.TravelCreditValidityMonths < 0)
            return BadRequest(new { message = "Travel credit validity cannot be negative" });
        if (!IsValidResolution(request.NonRefundableResolution))
            return BadRequest(new { message = "Unsupported non-refundable resolution" });

        var settings = await policyService.GetActiveSettingsAsync();
        settings.Name = string.IsNullOrWhiteSpace(request.Name) ? settings.Name : request.Name.Trim();
        settings.GracePeriodHours = request.GracePeriodHours;
        settings.AutoApproveGracePeriod = request.AutoApproveGracePeriod;
        settings.RequireApprovalLateCancellation = request.RequireApprovalLateCancellation;
        settings.RequireApprovalNoShow = request.RequireApprovalNoShow;
        settings.RequireApprovalNonRefundable = request.RequireApprovalNonRefundable;
        settings.NonRefundableResolution = request.NonRefundableResolution.Trim();
        settings.AllowTravelCredit = request.AllowTravelCredit;
        settings.TravelCreditValidityMonths = request.TravelCreditValidityMonths;
        settings.AllowAmountOverride = request.AllowAmountOverride;
        settings.MaxRefundOverridePercent = request.MaxRefundOverridePercent;
        settings.RequireCancellationReason = request.RequireCancellationReason;
        settings.Notes = request.Notes ?? string.Empty;
        settings.UpdatedBy = actor.Email;
        settings.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(settings);
    }

    // POST api/cancellation-policies/rules
    [HttpPost("rules")]
    public async Task<IActionResult> CreateRule(CancellationPolicyRule request)
    {
        var actor = await staffContext.ResolveAsync(User);
        if (!actor.CanManagePolicy) return Forbid();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var rule = new CancellationPolicyRule
        {
            Name = request.Name.Trim(),
            PolicyTier = request.PolicyTier.Trim().ToLowerInvariant(),
            Airline = (request.Airline ?? string.Empty).Trim(),
            FareType = (request.FareType ?? string.Empty).Trim(),
            MinHoursBeforeDeparture = request.MinHoursBeforeDeparture,
            MaxHoursBeforeDeparture = request.MaxHoursBeforeDeparture,
            RefundPercentage = request.RefundPercentage,
            AirlineFeePercent = request.AirlineFeePercent,
            AirlineFeeAmount = request.AirlineFeeAmount,
            AgencyServiceFee = request.AgencyServiceFee,
            PaymentProcessingFee = request.PaymentProcessingFee,
            OtherFee = request.OtherFee,
            IsNonRefundable = request.IsNonRefundable,
            RequiresApproval = request.RequiresApproval,
            Resolution = string.IsNullOrWhiteSpace(request.Resolution)
                ? RefundResolutions.Cash
                : request.Resolution.Trim(),
            Priority = request.Priority,
            IsActive = true,
            Notes = request.Notes ?? string.Empty
        };

        db.CancellationPolicyRules.Add(rule);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPolicy), new { id = rule.Id }, rule);
    }

    // PUT api/cancellation-policies/rules/{id}
    [HttpPut("rules/{id:int}")]
    public async Task<IActionResult> UpdateRule(int id, CancellationPolicyRule request)
    {
        var actor = await staffContext.ResolveAsync(User);
        if (!actor.CanManagePolicy) return Forbid();

        var rule = await db.CancellationPolicyRules.FirstOrDefaultAsync(r => r.Id == id);
        if (rule is null) return NotFound(new { message = "Policy rule not found" });

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        rule.Name = request.Name.Trim();
        rule.PolicyTier = request.PolicyTier.Trim().ToLowerInvariant();
        rule.Airline = (request.Airline ?? string.Empty).Trim();
        rule.FareType = (request.FareType ?? string.Empty).Trim();
        rule.MinHoursBeforeDeparture = request.MinHoursBeforeDeparture;
        rule.MaxHoursBeforeDeparture = request.MaxHoursBeforeDeparture;
        rule.RefundPercentage = request.RefundPercentage;
        rule.AirlineFeePercent = request.AirlineFeePercent;
        rule.AirlineFeeAmount = request.AirlineFeeAmount;
        rule.AgencyServiceFee = request.AgencyServiceFee;
        rule.PaymentProcessingFee = request.PaymentProcessingFee;
        rule.OtherFee = request.OtherFee;
        rule.IsNonRefundable = request.IsNonRefundable;
        rule.RequiresApproval = request.RequiresApproval;
        rule.Resolution = string.IsNullOrWhiteSpace(request.Resolution) ? rule.Resolution : request.Resolution.Trim();
        rule.Priority = request.Priority;
        rule.IsActive = request.IsActive;
        rule.Notes = request.Notes ?? string.Empty;
        rule.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(rule);
    }

    // DELETE api/cancellation-policies/rules/{id} — deactivates rather than
    // deleting, because past cancellations reference the rule they used.
    [HttpDelete("rules/{id:int}")]
    public async Task<IActionResult> DeactivateRule(int id)
    {
        var actor = await staffContext.ResolveAsync(User);
        if (!actor.CanManagePolicy) return Forbid();

        var rule = await db.CancellationPolicyRules.FirstOrDefaultAsync(r => r.Id == id);
        if (rule is null) return NotFound(new { message = "Policy rule not found" });

        rule.IsActive = false;
        rule.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(rule);
    }

    // POST api/cancellation-policies/reset — restore the shipped defaults.
    [HttpPost("reset")]
    public async Task<IActionResult> ResetToDefaults()
    {
        var actor = await staffContext.ResolveAsync(User);
        if (!actor.CanManagePolicy) return Forbid();

        var current = await policyService.GetActiveSettingsAsync();
        var defaults = CancellationPolicyService.Defaults.Settings();
        current.GracePeriodHours = defaults.GracePeriodHours;
        current.AutoApproveGracePeriod = defaults.AutoApproveGracePeriod;
        current.RequireApprovalLateCancellation = defaults.RequireApprovalLateCancellation;
        current.RequireApprovalNoShow = defaults.RequireApprovalNoShow;
        current.RequireApprovalNonRefundable = defaults.RequireApprovalNonRefundable;
        current.NonRefundableResolution = defaults.NonRefundableResolution;
        current.AllowTravelCredit = defaults.AllowTravelCredit;
        current.TravelCreditValidityMonths = defaults.TravelCreditValidityMonths;
        current.AllowAmountOverride = defaults.AllowAmountOverride;
        current.MaxRefundOverridePercent = defaults.MaxRefundOverridePercent;
        current.RequireCancellationReason = defaults.RequireCancellationReason;
        current.UpdatedBy = actor.Email;
        current.UpdatedAt = DateTime.UtcNow;

        var rules = await db.CancellationPolicyRules.ToListAsync();
        db.CancellationPolicyRules.RemoveRange(rules);
        db.CancellationPolicyRules.AddRange(CancellationPolicyService.Defaults.Rules());

        await db.SaveChangesAsync();
        return Ok(new { message = "Cancellation policy restored to defaults" });
    }

    private static bool IsValidResolution(string? resolution) =>
        resolution is RefundResolutions.Cash or RefundResolutions.TravelCredit or RefundResolutions.None;

    private static string? Validate(CancellationPolicyRule rule)
    {
        if (string.IsNullOrWhiteSpace(rule.Name)) return "Rule name is required";
        if (!PolicyTiers.IsValid(rule.PolicyTier)) return "Unknown policy tier";
        if (rule.RefundPercentage is < 0 or > 100) return "Refund percentage must be between 0 and 100";
        if (rule.AirlineFeePercent is < 0 or > 100) return "Airline fee percent must be between 0 and 100";
        if (rule.MinHoursBeforeDeparture < 0) return "Minimum hours before departure cannot be negative";
        if (rule.MaxHoursBeforeDeparture < 0) return "Maximum hours before departure cannot be negative";
        if (rule.MaxHoursBeforeDeparture > 0 && rule.MaxHoursBeforeDeparture <= rule.MinHoursBeforeDeparture)
            return "Maximum hours before departure must be greater than the minimum";
        if (rule.AirlineFeeAmount < 0 || rule.AgencyServiceFee < 0 ||
            rule.PaymentProcessingFee < 0 || rule.OtherFee < 0)
            return "Fees cannot be negative";
        if (!string.IsNullOrWhiteSpace(rule.Resolution) && !IsValidResolution(rule.Resolution.Trim()))
            return "Unsupported refund resolution";
        if (!string.IsNullOrWhiteSpace(rule.FareType) &&
            !FareTypes.All.Any(f => f.Equals(rule.FareType.Trim(), StringComparison.OrdinalIgnoreCase)))
            return "Unknown fare type";
        return null;
    }
}
