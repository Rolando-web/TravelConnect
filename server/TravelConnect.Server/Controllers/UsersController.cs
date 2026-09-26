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
public class UsersController(TravelConnectDbContext db) : ControllerBase
{
    // Roles that only the platform owner may create/edit. An Agency Admin owns
    // the CRM/ERP and can manage their own workforce, but never these accounts.
    private static readonly HashSet<string> PrivilegedRoles = new(StringComparer.Ordinal)
    {
        "Super Admin",
        "Agency Admin"
    };

    // Canonical role allowlist. Anything else (including typo'd or lowercase
    // variants like "superadmin") is rejected outright so a stray string can
    // never smuggle a privilege through the privileged-role comparison.
    private static readonly HashSet<string> KnownRoles = new(StringComparer.Ordinal)
    {
        "Super Admin",
        "Agency Admin",
        "Agency Staff",
        "Finance Staff",
        "Supplier"
    };

    // Resolves the signed-in SystemUser from the Firebase identity, with the
    // same fallback as the other controllers: seeded accounts start with an
    // empty FirebaseUid, so fall back to the verified token email and persist
    // the UID binding on first use.
    private async Task<SystemUser?> CurrentUserAsync()
    {
        var uid = User.FindFirst("uid")?.Value ??
                  User.FindFirst("user_id")?.Value ??
                  User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        SystemUser? user = null;
        if (!string.IsNullOrWhiteSpace(uid))
            user = await db.SystemUsers.FirstOrDefaultAsync(u => u.FirebaseUid == uid);

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

        return user;
    }

    private static bool IsSuperAdmin(SystemUser u) => u.Role == "Super Admin";

    // Who may touch user records at all: the platform owner (Super Admin) and
    // the agency owner (Agency Admin, full CRM/ERP rights). Customers and staff
    // members are blocked server-side.
    private static bool IsManager(SystemUser u) =>
        u is not null && u.Role is "Super Admin" or "Agency Admin";

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var me = await CurrentUserAsync();
        if (me is null || !IsManager(me)) return Forbid();

        var query = db.SystemUsers.AsNoTracking();
        if (!IsSuperAdmin(me))
            query = query.Where(u => u.Role != "Super Admin");

        return Ok(await query.OrderByDescending(e => e.UpdatedAt).Take(500).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var me = await CurrentUserAsync();
        if (me is null || !IsManager(me)) return Forbid();

        var entity = await db.SystemUsers.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        if (!IsSuperAdmin(me) && entity.Role == "Super Admin") return Forbid();
        return Ok(entity);
    }

    /// <summary>
    /// Returns the signed-in account's own System Users row (any authenticated
    /// identity, including staff/agents — not just managers). The client's
    /// login flow uses this as the authoritative role source so an admin whose
    /// Firestore profile went stale can be reconciled automatically.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var me = await CurrentUserAsync();
        if (me is null) return NotFound(new { message = "This identity is not a System User" });
        return Ok(me);
    }

    [HttpPost]
    public async Task<IActionResult> Create(SystemUser entity)
    {
        var me = await CurrentUserAsync();
        if (me is null || !IsManager(me)) return Forbid();

        if (!KnownRoles.Contains(entity.Role))
            return BadRequest(new { message = $"Unknown role '{entity.Role}'. Use one of: Super Admin, Agency Admin, Agency Staff, Finance Staff, Supplier." });

        if (!IsSuperAdmin(me) && PrivilegedRoles.Contains(entity.Role))
            return StatusCode(403, new { message = "Agency Admin can only create employee accounts (Agency Staff, Finance Staff, Supplier)." });

        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        db.SystemUsers.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, SystemUser entity)
    {
        if (id != entity.Id) return BadRequest(new { message = "ID mismatch" });

        var me = await CurrentUserAsync();
        if (me is null || !IsManager(me)) return Forbid();

        var existing = await db.SystemUsers.FirstOrDefaultAsync(e => e.Id == id);
        if (existing is null) return NotFound(new { message = "Record not found" });

        if (!KnownRoles.Contains(entity.Role))
            return BadRequest(new { message = $"Unknown role '{entity.Role}'. Use one of: Super Admin, Agency Admin, Agency Staff, Finance Staff, Supplier." });

        // An Agency Admin can neither edit a platform-owner account nor promote
        // someone into a privileged role. Super Admins have no limits.
        if (!IsSuperAdmin(me) &&
            (existing.Role == "Super Admin" ||
             string.IsNullOrWhiteSpace(entity.Role) ||
             PrivilegedRoles.Contains(entity.Role)))
            return StatusCode(403, new { message = "Agency Admin cannot edit or promote privileged accounts (Super Admin / Agency Admin)." });

        db.Entry(existing).CurrentValues.SetValues(entity);
        existing.UpdatedAt = DateTime.UtcNow;
        existing.CreatedAt = existing.CreatedAt switch
        {
            DateTime min when min == default => DateTime.UtcNow,
            _ => existing.CreatedAt
        };
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var me = await CurrentUserAsync();
        if (me is null || !IsManager(me)) return Forbid();

        var entity = await db.SystemUsers.FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) return NotFound(new { message = "Record not found" });
        if (!IsSuperAdmin(me) && entity.Role == "Super Admin") return Forbid();
        db.SystemUsers.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}