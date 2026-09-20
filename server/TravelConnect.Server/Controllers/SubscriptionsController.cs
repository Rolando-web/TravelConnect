using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SubscriptionsController(TravelConnectDbContext db) : ControllerBase
{
    private async Task<bool> IsSuperAdmin()
    {
        var uid = User.FindFirst("uid")?.Value;

        SystemUser? user = null;
        if (!string.IsNullOrWhiteSpace(uid))
            user = await db.SystemUsers.FirstOrDefaultAsync(u => u.FirebaseUid == uid);

        // Seeded accounts start with an empty FirebaseUid, so fall back to the
        // verified Firebase token email and persist the binding on first use.
        if (user is null && !string.IsNullOrWhiteSpace(uid))
        {
            var email = User.FindFirst("email")?.Value ??
                        User.FindFirst(ClaimTypes.Email)?.Value ??
                        User.FindFirst("preferred_username")?.Value;
            if (!string.IsNullOrWhiteSpace(email))
            {
                user = await db.SystemUsers
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
                if (user is not null && !string.Equals(user.FirebaseUid, uid, StringComparison.Ordinal))
                {
                    user.FirebaseUid = uid;
                    user.UpdatedAt = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
            }
        }

        return user?.Role == "Super Admin";
    }

    [HttpGet("plans")]
    public async Task<ActionResult<IEnumerable<SubscriptionPlan>>> GetPlans()
    {
        return await db.SubscriptionPlans
            .AsNoTracking()
            .OrderBy(p => p.TierLevel)
            .ToListAsync();
    }

    [HttpGet("plans/{id:int}")]
    public async Task<ActionResult<SubscriptionPlan>> GetPlan(int id)
    {
        var plan = await db.SubscriptionPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (plan is null) return NotFound(new { message = "Plan not found" });
        return Ok(plan);
    }

    [HttpPost("plans")]
    public async Task<ActionResult<SubscriptionPlan>> CreatePlan(SubscriptionPlan plan)
    {
        if (!await IsSuperAdmin())
            return Forbid();

        plan.CreatedAt = DateTime.UtcNow;
        plan.UpdatedAt = DateTime.UtcNow;
        db.SubscriptionPlans.Add(plan);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, plan);
    }

    [HttpPut("plans/{id:int}")]
    public async Task<IActionResult> UpdatePlan(int id, SubscriptionPlan plan)
    {
        if (!await IsSuperAdmin())
            return Forbid();

        if (id != plan.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == id);
        if (existing is null) return NotFound(new { message = "Plan not found" });

        db.Entry(existing).CurrentValues.SetValues(plan);
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Subscription>>> GetAll()
    {
        if (!await IsSuperAdmin())
            return Forbid();

        return await db.Subscriptions
            .AsNoTracking()
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Subscription>> GetById(int id)
    {
        if (!await IsSuperAdmin())
            return Forbid();

        var sub = await db.Subscriptions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        if (sub is null) return NotFound(new { message = "Subscription not found" });
        return Ok(sub);
    }

    private async Task ApplyPlanDefaultsAsync(Subscription sub)
    {
        var plan = await db.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.TierLevel == sub.TierLevel);
        if (plan is null) return;
        sub.MonthlyPrice = plan.MonthlyPrice;
        sub.MaxUsers = plan.MaxUsers;
    }

    [HttpPost]
    public async Task<ActionResult<Subscription>> Create(Subscription sub)
    {
        if (!await IsSuperAdmin())
            return Forbid();

        await ApplyPlanDefaultsAsync(sub);
        sub.CreatedAt = DateTime.UtcNow;
        sub.UpdatedAt = DateTime.UtcNow;
        sub.LicenseKey = $"TC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
        db.Subscriptions.Add(sub);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = sub.Id }, sub);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Subscription sub)
    {
        if (!await IsSuperAdmin())
            return Forbid();

        if (id != sub.Id) return BadRequest(new { message = "ID mismatch" });
        var existing = await db.Subscriptions.FirstOrDefaultAsync(s => s.Id == id);
        if (existing is null) return NotFound(new { message = "Subscription not found" });

        await ApplyPlanDefaultsAsync(sub);
        db.Entry(existing).CurrentValues.SetValues(sub);
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await IsSuperAdmin())
            return Forbid();

        var sub = await db.Subscriptions.FirstOrDefaultAsync(s => s.Id == id);
        if (sub is null) return NotFound(new { message = "Subscription not found" });
        db.Subscriptions.Remove(sub);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        if (!await IsSuperAdmin())
            return Forbid();

        var all = await db.Subscriptions.AsNoTracking().ToListAsync();
        var now = DateTime.UtcNow;

        return Ok(new
        {
            total = all.Count,
            active = all.Count(s => s.PlanStatus == "Active"),
            trial = all.Count(s => s.PlanStatus == "Trial"),
            expired = all.Count(s => s.PlanStatus == "Expired"),
            suspended = all.Count(s => s.PlanStatus == "Suspended"),
            monthlyRevenue = all.Where(s => s.PlanStatus is "Active" or "Trial").Sum(s => s.MonthlyPrice),
            expiringSoon = all.Count(s => s.PlanStatus == "Active" && s.EndDate > now && s.EndDate <= now.AddDays(30)),
            tierBreakdown = all.GroupBy(s => s.TierLevel)
                .Select(g => new { tier = g.Key, count = g.Count() })
                .OrderBy(x => x.tier)
        });
    }
}
