using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Services;

/// <summary>Who is asking, as far as the cancellation/refund module is concerned.</summary>
public record StaffActor(SystemUser? User, string Email, string DisplayName)
{
    public bool IsAuthenticated => User is not null;
    public string Role => User?.Role ?? string.Empty;

    public bool IsSuperAdmin => Is(StaffRoles.SuperAdmin);
    public bool IsAgencyAdmin => Is(StaffRoles.AgencyAdmin);
    public bool IsFinanceStaff => Is(StaffRoles.FinanceStaff);
    public bool IsAgencyStaff => Is(StaffRoles.AgencyStaff);

    /// <summary>May review, approve or reject cancellation requests.</summary>
    public bool CanApproveCancellation => IsSuperAdmin || IsAgencyAdmin;

    /// <summary>May move money: approve, adjust, process and complete refunds.</summary>
    public bool CanManageRefunds => IsSuperAdmin || IsAgencyAdmin || IsFinanceStaff;

    /// <summary>May hand-edit the calculated refund amount.</summary>
    public bool CanOverrideRefundAmount => IsSuperAdmin || IsAgencyAdmin;

    /// <summary>May change the cancellation policy itself.</summary>
    public bool CanManagePolicy => IsSuperAdmin || IsAgencyAdmin;

    /// <summary>Read-only access to the queue.</summary>
    public bool CanView => CanApproveCancellation || CanManageRefunds || IsAgencyStaff;

    public bool Is(string role) =>
        User is not null &&
        User.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) &&
        string.Equals(User.Role, role, StringComparison.OrdinalIgnoreCase);
}

/// <summary>Canonical role names, so a typo can never silently disable a permission.</summary>
public static class StaffRoles
{
    public const string SuperAdmin = "Super Admin";
    public const string AgencyAdmin = "Agency Admin";
    public const string AgencyStaff = "Agency Staff";
    public const string FinanceStaff = "Finance Staff";
}

/// <summary>
/// Resolves the signed-in Firebase identity to a SystemUser row so the
/// cancellation/refund endpoints can enforce role-based permissions instead of
/// trusting anything in the request body. A user with no SystemUser record (a
/// plain customer account) resolves to an unauthenticated actor with no
/// permissions.
/// </summary>
public class StaffContextService(TravelConnectDbContext db)
{
    public static string Uid(ClaimsPrincipal? user) =>
        user?.FindFirst("uid")?.Value
        ?? user?.FindFirst("user_id")?.Value
        ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? string.Empty;

    public static string Email(ClaimsPrincipal? user) =>
        user?.FindFirst("email")?.Value
        ?? user?.FindFirst(ClaimTypes.Email)?.Value
        ?? user?.FindFirst("preferred_username")?.Value
        ?? string.Empty;

    public async Task<StaffActor> ResolveAsync(ClaimsPrincipal? user, CancellationToken ct = default)
    {
        var uid = Uid(user);
        var email = Email(user);
        if (string.IsNullOrWhiteSpace(uid)) return new StaffActor(null, email, email);

        var systemUser = await db.SystemUsers.FirstOrDefaultAsync(u => u.FirebaseUid == uid, ct);

        // Seeded accounts have no FirebaseUid yet, so fall back to the verified
        // token email and persist the link for next time.
        if (systemUser is null && !string.IsNullOrWhiteSpace(email))
        {
            systemUser = await db.SystemUsers.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), ct);
            if (systemUser is not null && !string.Equals(systemUser.FirebaseUid, uid, StringComparison.Ordinal))
            {
                systemUser.FirebaseUid = uid;
                systemUser.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
        }

        if (systemUser is null) return new StaffActor(null, email, email);
        return new StaffActor(systemUser, systemUser.Email, systemUser.DisplayName);
    }
}
