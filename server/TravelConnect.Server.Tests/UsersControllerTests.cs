using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Controllers;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Tests;

public class UsersControllerTests
{
    private static UsersController Controller(TravelConnectDbContext db, string? uid, string? email) =>
        new UsersController(db).WithIdentity(uid, email);

    private static async Task<SystemUser> SeedUserAsync(
        TravelConnectDbContext db,
        string uid,
        string email,
        string role,
        string status = "Active")
    {
        var u = new SystemUser
        {
            FirebaseUid = uid,
            Email = email,
            DisplayName = role.Replace(" ", ""),
            Role = role,
            Status = status
        };
        db.SystemUsers.Add(u);
        await db.SaveChangesAsync();
        return u;
    }

    private static ObjectResult AssertForbiddenMessage(string message, IActionResult result)
    {
        var res = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, res.StatusCode);
        var json = TestDb.ToJson(res.Value);
        Assert.Equal(message, json.GetProperty("message").GetString());
        return res;
    }

    [Fact]
    public async Task GetAll_super_admin_sees_everyone()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "s", "s@tc.com", "Super Admin");
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");
        await SeedUserAsync(db, "f", "f@tc.com", "Finance Staff");

        var result = await Controller(db, "s", "s@tc.com").GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<List<SystemUser>>(ok.Value);
        Assert.Equal(3, items.Count);
    }

    [Fact]
    public async Task GetAll_agency_admin_hides_super_admin_rows()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "s", "s@tc.com", "Super Admin");
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");
        await SeedUserAsync(db, "f", "f@tc.com", "Finance Staff");
        await SeedUserAsync(db, "sup", "sup@tc.com", "Supplier");

        var result = await Controller(db, "a", "a@tc.com").GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<List<SystemUser>>(ok.Value);
        Assert.Equal(3, items.Count);
        Assert.DoesNotContain(items, u => u.Role == "Super Admin");
        Assert.All(items, u => Assert.NotEqual("Super Admin", u.Role));
    }

    [Fact]
    public async Task GetAll_non_manager_is_forbidden()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");
        await SeedUserAsync(db, "st", "st@tc.com", "Agency Staff");
        await SeedUserAsync(db, "cu", "cu@tc.com", "Customer");

        Assert.IsType<ForbidResult>(await Controller(db, "st", "st@tc.com").GetAll());
        Assert.IsType<ForbidResult>(await Controller(db, "cu", "cu@tc.com").GetAll());
    }

    [Fact]
    public async Task GetAll_unknown_identity_is_forbidden()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");

        Assert.IsType<ForbidResult>(await Controller(db, "ghost", "ghost@tc.com").GetAll());
        Assert.IsType<ForbidResult>(await Controller(db, "", "").GetAll());
    }

    [Fact]
    public async Task GetById_agency_admin_cannot_read_super_admin()
    {
        using var db = TestDb.Create();
        var sup = await SeedUserAsync(db, "s", "s@tc.com", "Super Admin");
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");

        Assert.IsType<ForbidResult>(await Controller(db, "a", "a@tc.com").GetById(sup.Id));
    }

    [Fact]
    public async Task Create_agency_admin_can_create_employee()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");

        var result = await Controller(db, "a", "a@tc.com").Create(new SystemUser
        {
            Email = "emp@tc.com",
            DisplayName = "New Hire",
            Role = "Agency Staff",
            Status = "Active"
        });

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var saved = Assert.IsType<SystemUser>(created.Value);
        Assert.Equal("Agency Staff", saved.Role);
    }

    [Fact]
    public async Task Create_agency_admin_cannot_create_privileged_roles()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");

        foreach (var role in new[] { "Super Admin", "Agency Admin" })
        {
            var result = await Controller(db, "a", "a@tc.com").Create(new SystemUser
            {
                Email = $"x-{role}@tc.com",
                DisplayName = "X",
                Role = role
            });
            AssertForbiddenMessage(
                "Agency Admin can only create employee accounts (Agency Staff, Finance Staff, Supplier).",
                result);
        }
    }

    [Fact]
    public async Task Create_super_admin_can_create_any_role()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "s", "s@tc.com", "Super Admin");

        foreach (var role in new[] { "Super Admin", "Agency Admin", "Finance Staff" })
        {
            var result = await Controller(db, "s", "s@tc.com").Create(new SystemUser
            {
                Email = $"y-{role}@tc.com",
                DisplayName = "Y",
                Role = role
            });
            var created = Assert.IsType<CreatedAtActionResult>(result);
            Assert.Equal(role, Assert.IsType<SystemUser>(created.Value).Role);
        }
    }

    [Fact]
    public async Task Update_agency_admin_cannot_touch_super_admin()
    {
        using var db = TestDb.Create();
        var sup = await SeedUserAsync(db, "s", "s@tc.com", "Super Admin");
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");

        sup.DisplayName = "Hacked";
        var result = await Controller(db, "a", "a@tc.com").Update(sup.Id, sup);

        AssertForbiddenMessage(
            "Agency Admin cannot edit or promote privileged accounts (Super Admin / Agency Admin).",
            result);
    }

    [Fact]
    public async Task Update_agency_admin_cannot_promote_employee()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");
        var emp = await SeedUserAsync(db, "e", "e@tc.com", "Agency Staff");

        emp.Role = "Super Admin";
        var result = await Controller(db, "a", "a@tc.com").Update(emp.Id, emp);

        AssertForbiddenMessage(
            "Agency Admin cannot edit or promote privileged accounts (Super Admin / Agency Admin).",
            result);
    }

    [Fact]
    public async Task Update_agency_admin_can_update_employee()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");
        var emp = await SeedUserAsync(db, "e", "e@tc.com", "Agency Staff");

        emp.DisplayName = "Renamed";
        var result = await Controller(db, "a", "a@tc.com").Update(emp.Id, emp);

        Assert.IsType<NoContentResult>(result);
        var reloaded = await db.SystemUsers.FirstAsync(u => u.Id == emp.Id);
        Assert.Equal("Renamed", reloaded.DisplayName);
        Assert.Equal("Agency Staff", reloaded.Role);
    }

    [Fact]
    public async Task Delete_agency_admin_cannot_delete_super_admin()
    {
        using var db = TestDb.Create();
        var sup = await SeedUserAsync(db, "s", "s@tc.com", "Super Admin");
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");

        Assert.IsType<ForbidResult>(await Controller(db, "a", "a@tc.com").Delete(sup.Id));
        Assert.Equal(2, db.SystemUsers.Count());
    }

    [Fact]
    public async Task Delete_agency_admin_can_delete_employee()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");
        var emp = await SeedUserAsync(db, "e", "e@tc.com", "Finance Staff");

        Assert.IsType<NoContentResult>(await Controller(db, "a", "a@tc.com").Delete(emp.Id));
        Assert.Single(db.SystemUsers);
    }

    /* ── GET /api/users/me (role reconciliation source) ────────── */

    [Fact]
    public async Task Me_returns_self_row_for_any_staff_identity()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "st", "st@tc.com", "Agency Staff");
        await SeedUserAsync(db, "s", "s@tc.com", "Super Admin");

        var asStaff = Assert.IsType<OkObjectResult>(await Controller(db, "st", "st@tc.com").Me());
        var staffRow = Assert.IsType<SystemUser>(asStaff.Value);
        Assert.Equal("Agency Staff", staffRow.Role);

        var asSuper = Assert.IsType<OkObjectResult>(await Controller(db, "s", "s@tc.com").Me());
        Assert.Equal("Super Admin", Assert.IsType<SystemUser>(asSuper.Value).Role);
    }

    [Fact]
    public async Task Me_binds_and_resolves_by_email_when_uid_is_unset()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "", "admin@tc.com", "Agency Admin");

        var result = Assert.IsType<OkObjectResult>(
            await Controller(db, "fresh-uid", "admin@tc.com").Me());

        var row = Assert.IsType<SystemUser>(result.Value);
        Assert.Equal("Agency Admin", row.Role);
        Assert.Equal("fresh-uid", row.FirebaseUid);

        var persisted = await db.SystemUsers.FirstAsync(u => u.Email == "admin@tc.com");
        Assert.Equal("fresh-uid", persisted.FirebaseUid);
    }

    [Fact]
    public async Task Me_returns_404_for_identity_that_is_not_a_system_user()
    {
        using var db = TestDb.Create();
        await SeedUserAsync(db, "a", "a@tc.com", "Agency Admin");

        Assert.IsType<NotFoundObjectResult>(await Controller(db, "ghost", "ghost@tc.com").Me());
        Assert.IsType<NotFoundObjectResult>(await Controller(db, "", "").Me());
    }
}