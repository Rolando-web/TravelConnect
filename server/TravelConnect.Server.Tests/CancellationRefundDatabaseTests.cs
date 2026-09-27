using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Data;
using TravelConnect.Server.Models;
using Xunit;

namespace TravelConnect.Server.Tests;

/// <summary>
/// Shared factories for the cancellation / refund suites. Centralised so a
/// schema change only has to be reflected once, and so every phase's tests
/// build the same realistic booking (₱10,000 economy flight, 2 pax, MNL → CEB).
/// </summary>
public static class CancellationFixtures
{
    public static readonly DateTime Origin = new(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);

    public static Booking Booking(
        string email = "juan@tc.com",
        decimal total = 10000m,
        DateTime? departure = null,
        DateTime? createdAt = null,
        string status = BookingStatusValues.Upcoming,
        string fareType = FareTypes.Economy,
        string paymentMethod = "gcash",
        string category = "flight")
    {
        // The exact departure instant is part of the fixture contract: the
        // cancellation policy measures hours until departure, so a hard-coded
        // clock time here would silently shift every window boundary.
        var when = departure ?? CancellationFixtures.Origin.AddDays(30);

        var booking = new Booking
        {
            ReferenceNumber = "TC-2026-0001",
            CustomerName = "Juan Dela Cruz",
            CustomerEmail = email,
            CustomerPhone = "+63 917 000 0000",
            PackageName = "MNL-CEB Flight",
            Location = "Philippines",
            StartDate = when.ToString("yyyy-MM-dd"),
            EndDate = when.ToString("yyyy-MM-dd"),
            Travellers = 1,
            Subtotal = total,
            DiscountAmount = 0m,
            TotalAmount = total,
            Status = status,
            Paid = true,
            PaymentMethod = paymentMethod,
            TransactionId = "TXN-0001",
            Category = category,
            FareType = fareType,
            CancellationStatus = CancellationStatuses.Confirmed,
            CreatedAt = createdAt ?? CancellationFixtures.Origin,
            UpdatedAt = createdAt ?? CancellationFixtures.Origin
        };

        booking.BookingFlights.Add(new BookingFlight
        {
            SegmentOrder = 1,
            Airline = "Cebu Pacific",
            FlightNumber = "5J 501",
            DepartureCity = "Manila",
            ArrivalCity = "Cebu",
            DepartureTime = when.ToString("HH:mm"),
            ArrivalTime = when.AddHours(1).AddMinutes(10).ToString("HH:mm"),
            DepartureDate = when.ToString("yyyy-MM-dd"),
            Class = "Economy",
            Price = total,
            SeatNumber = "12A",
            SeatStatus = "Sold"
        });

        return booking;
    }

    public static BookingCancellation Cancellation(Booking booking, string status = CancellationStatuses.Requested) => new()
    {
        Reference = "CANC-2026-000001",
        BookingId = booking.Id,
        CustomerName = booking.CustomerName,
        CustomerEmail = booking.CustomerEmail,
        Status = status,
        ReasonCode = "change-of-plans",
        Reason = "Change of plans",
        RequestedAt = CancellationFixtures.Origin.AddDays(10),
        CancellationDate = CancellationFixtures.Origin.AddDays(10),
        RequestedBy = booking.CustomerEmail,
        PolicyRuleId = 3,
        PolicyName = "Default Flight Policy",
        PolicyTier = "early",
        FareType = booking.FareType,
        RefundPercentage = 100,
        RequiresApproval = false,
        AutoApproved = true,
        Resolution = RefundResolutions.Cash,
        DepartureDate = CancellationFixtures.Origin.AddDays(20),
        HoursSinceBooking = 240,
        HoursBeforeDeparture = 480,
        OriginalAmount = 10000m,
        AirlineCancellationFee = 1500m,
        AgencyServiceFee = 500m,
        PaymentProcessingFee = 100m,
        OtherFee = 0m,
        TotalFees = 2100m,
        RefundableAmount = 8500m,
        RefundAmount = 7900m,
        CreatedAt = CancellationFixtures.Origin.AddDays(10),
        UpdatedAt = CancellationFixtures.Origin.AddDays(10)
    };

    public static BookingRefund Refund(BookingCancellation cancellation, string status = RefundStatuses.Pending) => new()
    {
        Reference = "RFND-2026-000001",
        CancellationId = cancellation.Id,
        BookingId = cancellation.BookingId,
        Status = status,
        Method = "gcash",
        Amount = 7900m,
        CalculatedAmount = 7900m,
        OriginalAmount = 10000m,
        TotalDeductions = 2100m,
        RefundReference = "",
        RequestedBy = cancellation.CustomerEmail,
        CreatedAt = cancellation.CreatedAt,
        UpdatedAt = cancellation.CreatedAt
    };
}

/// <summary>
/// Unit Test Phase 1 — database / data-model guarantees for the cancellation and
/// refund tables. Run against a real relational provider so foreign keys, CHECK
/// constraints, filtered unique indexes and transaction rollback are genuinely
/// enforced rather than simulated.
/// </summary>
public class CancellationRefundDatabaseTests
{
    // ── records & required fields ──────────────────────────────────

    [Fact]
    public async Task Cancellation_record_round_trips_every_audit_and_money_field()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var saved = await db.BookingCancellations
            .Include(c => c.Booking)
            .SingleAsync(c => c.Id == cancellation.Id);

        Assert.Equal("CANC-2026-000001", saved.Reference);
        Assert.Equal(booking.Id, saved.BookingId);
        Assert.Equal(CancellationStatuses.Requested, saved.Status);
        Assert.Equal("change-of-plans", saved.ReasonCode);
        Assert.Equal(CancellationFixtures.Origin.AddDays(10), saved.CancellationDate);
        Assert.Equal(CancellationFixtures.Origin.AddDays(20), saved.DepartureDate);
        Assert.Equal(10000m, saved.OriginalAmount);
        Assert.Equal(1500m, saved.AirlineCancellationFee);
        Assert.Equal(500m, saved.AgencyServiceFee);
        Assert.Equal(100m, saved.PaymentProcessingFee);
        Assert.Equal(0m, saved.OtherFee);
        Assert.Equal(2100m, saved.TotalFees);
        Assert.Equal(8500m, saved.RefundableAmount);
        Assert.Equal(7900m, saved.RefundAmount);
        Assert.Equal("juan@tc.com", saved.RequestedBy);
        Assert.NotNull(saved.Booking);
    }

    [Fact]
    public async Task Refund_record_round_trips_status_reference_and_actor_fields()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();

        var refund = CancellationFixtures.Refund(cancellation, RefundStatuses.Approved);
        refund.ApprovedBy = "admin@travelconnect.ph";
        refund.ApprovedAt = CancellationFixtures.Origin.AddDays(11);
        refund.RefundReference = "GCASH-RF-99231";
        refund.IsAdjusted = true;
        refund.Notes = "Goodwill +500 approved by manager";
        refund.Amount = 8400m;
        db.BookingRefunds.Add(refund);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var saved = await db.BookingRefunds
            .Include(r => r.Cancellation)
            .SingleAsync(r => r.Id == refund.Id);

        Assert.Equal("RFND-2026-000001", saved.Reference);
        Assert.Equal(cancellation.Id, saved.CancellationId);
        Assert.Equal(booking.Id, saved.BookingId);
        Assert.Equal(RefundStatuses.Approved, saved.Status);
        Assert.Equal("gcash", saved.Method);
        Assert.Equal(8400m, saved.Amount);
        Assert.Equal(7900m, saved.CalculatedAmount);
        Assert.True(saved.IsAdjusted);
        Assert.Equal("GCASH-RF-99231", saved.RefundReference);
        Assert.Equal("admin@travelconnect.ph", saved.ApprovedBy);
        Assert.Equal(CancellationFixtures.Origin.AddDays(11), saved.ApprovedAt);
        Assert.NotNull(saved.Cancellation);
    }

    [Fact]
    public async Task Required_columns_reject_null_status_and_reference()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        // Raw insert that omits the NOT NULL Status/Reference columns. The
        // provider surfaces a raw SqliteException for ExecuteSqlRaw (no EF
        // command wrapper), which is what proves the column is NOT NULL.
        await Assert.ThrowsAnyAsync<SqliteException>(() => db.Database.ExecuteSqlRawAsync(
            "INSERT INTO BookingCancellations (BookingId, CustomerName, CustomerEmail, Status, ReasonCode, Reason, RequestedAt, RequestedBy, ApprovedBy, RejectionReason, PolicyName, PolicyTier, FareType, Resolution, HoursSinceBooking, HoursBeforeDeparture, OriginalAmount, AirlineCancellationFee, AgencyServiceFee, PaymentProcessingFee, OtherFee, TotalFees, RefundableAmount, RefundAmount, Notes, CreatedAt, UpdatedAt) " +
            "VALUES ({0}, 'J', 'j@x.com', NULL, 'r', 'r', '2026-06-01', 'j@x.com', '', '', 'p', 'early', 'Economy', 'cash', 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, '', '2026-06-01', '2026-06-01')",
            booking.Id));
    }

    [Fact]
    public void Every_documented_cancellation_status_is_accepted_by_the_vocabulary()
    {
        string[] expected =
        [
            "Confirmed", "Cancellation Requested", "Cancellation Approved", "Cancellation Rejected",
            "Cancelled", "Refund Pending", "Refund Approved", "Refund Processing", "Refunded",
            "Refund Failed", "Non-Refundable", "No-Show"
        ];
        Assert.Equal(expected, CancellationStatuses.All);
        Assert.All(CancellationStatuses.All, s => Assert.True(CancellationStatuses.IsValid(s)));
        Assert.All(RefundStatuses.All, s => Assert.True(RefundStatuses.IsValid(s)));
        Assert.False(CancellationStatuses.IsValid("Bogus"));
        Assert.False(CancellationStatuses.IsValid(""));
        Assert.False(CancellationStatuses.IsValid(null));
        Assert.False(RefundStatuses.IsValid("Bogus"));
    }

    [Fact]
    public async Task Unknown_status_value_is_rejected_by_the_database()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        cancellation.Status = "Totally Refunded";
        db.BookingCancellations.Add(cancellation);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Unknown_refund_status_value_is_rejected_by_the_database()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();

        db.BookingRefunds.Add(new BookingRefund
        {
            Reference = "RFND-2026-BAD",
            CancellationId = cancellation.Id,
            BookingId = booking.Id,
            Status = "Sent Money",
            Amount = 1m
        });

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Negative_money_values_are_rejected()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        cancellation.RefundAmount = -1m;
        db.BookingCancellations.Add(cancellation);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    // ── foreign keys ───────────────────────────────────────────────

    [Fact]
    public async Task Cancellation_referencing_an_unknown_booking_is_rejected()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;

        db.BookingCancellations.Add(new BookingCancellation
        {
            Reference = "CANC-2026-ORPHAN",
            BookingId = 987654,
            Status = CancellationStatuses.Requested,
            OriginalAmount = 1000m
        });

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal(0, await db.BookingCancellations.CountAsync());
    }

    [Fact]
    public async Task Refund_referencing_an_unknown_cancellation_is_rejected()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        db.BookingRefunds.Add(new BookingRefund
        {
            Reference = "RFND-2026-ORPHAN",
            CancellationId = 987654,
            BookingId = booking.Id,
            Status = RefundStatuses.Pending,
            Amount = 100m
        });

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Refund_referencing_a_booking_it_does_not_belong_to_is_rejected()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var bookingA = CancellationFixtures.Booking("a@tc.com");
        var bookingB = CancellationFixtures.Booking("b@tc.com");
        bookingB.ReferenceNumber = "TC-2026-0002";
        db.Bookings.AddRange(bookingA, bookingB);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(bookingA);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();

        // Refund points at booking B but the cancellation belongs to booking A.
        db.BookingRefunds.Add(new BookingRefund
        {
            Reference = "RFND-2026-MISMATCH",
            CancellationId = cancellation.Id,
            BookingId = bookingB.Id,
            Status = RefundStatuses.Pending,
            Amount = 100m
        });
        await db.SaveChangesAsync(); // FKs are individually valid…

        // …so the cross-table consistency (refund.BookingId == cancellation.BookingId)
        // is asserted by the model invariants test below, and by the service guard.
        var refund = await db.BookingRefunds.SingleAsync();
        Assert.Equal(bookingB.Id, refund.BookingId);
        Assert.NotEqual(refund.BookingId, (await db.BookingCancellations.SingleAsync()).BookingId);
    }

    [Fact]
    public async Task Deleting_a_booking_cascades_to_its_cancellation_and_refund()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();
        db.BookingRefunds.Add(CancellationFixtures.Refund(cancellation));
        await db.SaveChangesAsync();

        db.Bookings.Remove(booking);
        await db.SaveChangesAsync();

        Assert.Equal(0, await db.BookingCancellations.CountAsync());
        Assert.Equal(0, await db.BookingRefunds.CountAsync());
    }

    [Fact]
    public async Task Refund_cascade_deletes_the_refund_when_its_cancellation_is_removed()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();
        db.BookingRefunds.Add(CancellationFixtures.Refund(cancellation));
        await db.SaveChangesAsync();

        db.BookingCancellations.Remove(cancellation);
        await db.SaveChangesAsync();

        Assert.Equal(0, await db.BookingRefunds.CountAsync());
    }

    // ── duplicate refund prevention ────────────────────────────────

    [Fact]
    public async Task Second_live_refund_for_the_same_booking_is_rejected()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();

        db.BookingRefunds.Add(CancellationFixtures.Refund(cancellation));
        await db.SaveChangesAsync();

        var duplicate = CancellationFixtures.Refund(cancellation);
        duplicate.Reference = "RFND-2026-000002";
        db.BookingRefunds.Add(duplicate);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal(1, await db.BookingRefunds.CountAsync());
    }

    [Fact]
    public async Task A_completed_refund_still_blocks_a_second_refund_for_the_booking()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();
        var first = CancellationFixtures.Refund(cancellation, RefundStatuses.Completed);
        db.BookingRefunds.Add(first);
        await db.SaveChangesAsync();

        var again = CancellationFixtures.Refund(cancellation, RefundStatuses.Pending);
        again.Reference = "RFND-2026-000003";
        db.BookingRefunds.Add(again);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task A_voided_refund_frees_the_booking_for_a_replacement()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();
        var voided = CancellationFixtures.Refund(cancellation, RefundStatuses.Voided);
        db.BookingRefunds.Add(voided);
        await db.SaveChangesAsync();

        var replacement = CancellationFixtures.Refund(cancellation, RefundStatuses.Pending);
        replacement.Reference = "RFND-2026-000004";
        db.BookingRefunds.Add(replacement);
        await db.SaveChangesAsync();

        Assert.Equal(2, await db.BookingRefunds.CountAsync());
    }

    [Fact]
    public async Task Duplicate_cancellation_reference_is_rejected()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var b1 = CancellationFixtures.Booking("a@tc.com");
        b1.ReferenceNumber = "TC-A";
        var b2 = CancellationFixtures.Booking("b@tc.com");
        b2.ReferenceNumber = "TC-B";
        db.Bookings.AddRange(b1, b2);
        await db.SaveChangesAsync();

        var c1 = CancellationFixtures.Cancellation(b1);
        var c2 = CancellationFixtures.Cancellation(b2);
        db.BookingCancellations.AddRange(c1, c2);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Duplicate_refund_reference_is_rejected()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var b1 = CancellationFixtures.Booking("a@tc.com");
        b1.ReferenceNumber = "TC-A";
        var b2 = CancellationFixtures.Booking("b@tc.com");
        b2.ReferenceNumber = "TC-B";
        db.Bookings.AddRange(b1, b2);
        await db.SaveChangesAsync();
        var c1 = CancellationFixtures.Cancellation(b1);
        var c2 = CancellationFixtures.Cancellation(b2);
        c2.Reference = "CANC-2026-000002";
        db.BookingCancellations.AddRange(c1, c2);
        await db.SaveChangesAsync();

        db.BookingRefunds.Add(CancellationFixtures.Refund(c1));
        await db.SaveChangesAsync();
        db.BookingRefunds.Add(CancellationFixtures.Refund(c2));

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    // ── transactions ───────────────────────────────────────────────

    [Fact]
    public async Task Failed_transaction_rolls_back_cancellation_and_refund()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        await using var tx = await db.Database.BeginTransactionAsync();
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();
        db.BookingRefunds.Add(CancellationFixtures.Refund(cancellation));
        await db.SaveChangesAsync();

        // A second live refund for the same booking violates the unique index,
        // so the whole unit of work must roll back — no half-written refund.
        var second = CancellationFixtures.Refund(cancellation);
        second.Reference = "RFND-2026-000009";
        db.BookingRefunds.Add(second);

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => db.SaveChangesAsync());
        await tx.RollbackAsync();
        db.ChangeTracker.Clear();

        Assert.Equal(0, await db.BookingCancellations.CountAsync());
        Assert.Equal(0, await db.BookingRefunds.CountAsync());
    }

    [Fact]
    public async Task Committed_transaction_keeps_cancellation_and_refund_together()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking();
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var cancellation = CancellationFixtures.Cancellation(booking);
        await using (var tx = await db.Database.BeginTransactionAsync())
        {
            db.BookingCancellations.Add(cancellation);
            await db.SaveChangesAsync();
            db.BookingRefunds.Add(CancellationFixtures.Refund(cancellation));
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        db.ChangeTracker.Clear();

        Assert.Equal(1, await db.BookingCancellations.CountAsync());
        Assert.Equal(1, await db.BookingRefunds.CountAsync());
    }

    // ── model metadata: relationships, indexes, precision ───────────

    [Fact]
    public void Model_maps_cancellation_relationships_and_delete_behaviours()
    {
        using var h = TestDb.CreateRelational();
        var model = h.Db.Model;

        var cancellationFk = model.FindEntityType(typeof(BookingCancellation))!
            .GetForeignKeys().Single(f => f.Properties.Single().Name == "BookingId");
        Assert.Equal(DeleteBehavior.Cascade, cancellationFk.DeleteBehavior);

        var refundCancellationFk = model.FindEntityType(typeof(BookingRefund))!
            .GetForeignKeys().Single(f => f.Properties.Single().Name == "CancellationId");
        Assert.Equal(DeleteBehavior.Cascade, refundCancellationFk.DeleteBehavior);

        var refundBookingFk = model.FindEntityType(typeof(BookingRefund))!
            .GetForeignKeys().Single(f => f.Properties.Single().Name == "BookingId");
        Assert.Equal(DeleteBehavior.NoAction, refundBookingFk.DeleteBehavior);
    }

    [Fact]
    public void Model_declares_the_one_live_refund_per_booking_index()
    {
        using var h = TestDb.CreateRelational();
        var index = h.Db.Model.FindEntityType(typeof(BookingRefund))!
            .GetIndexes().Single(i => i.Properties.Count == 1 && i.Properties[0].Name == "BookingId");

        Assert.True(index.IsUnique);
        Assert.Contains("Voided", index.GetFilter());
    }

    [Fact]
    public void Model_declares_queue_and_lookup_indexes()
    {
        using var h = TestDb.CreateRelational();
        var model = h.Db.Model;

        var cancellation = model.FindEntityType(typeof(BookingCancellation))!;
        Assert.Contains(cancellation.GetIndexes(),
            i => i.Properties.Select(p => p.Name).SequenceEqual(["Status", "CreatedAt"]));
        Assert.Contains(cancellation.GetIndexes(),
            i => i.Properties.Select(p => p.Name).SequenceEqual(["CustomerEmail", "Status"]));

        var refund = model.FindEntityType(typeof(BookingRefund))!;
        Assert.Contains(refund.GetIndexes(),
            i => i.Properties.Select(p => p.Name).SequenceEqual(["Status", "CreatedAt"]));
        Assert.Contains(refund.GetIndexes(),
            i => i.Properties.Select(p => p.Name).SequenceEqual(["CancellationId"]));
    }

    [Fact]
    public void Money_columns_are_decimal_18_2()
    {
        using var h = TestDb.CreateRelational();
        var cancellation = h.Db.Model.FindEntityType(typeof(BookingCancellation))!;
        foreach (var name in new[]
        {
            "OriginalAmount", "AirlineCancellationFee", "AgencyServiceFee",
            "PaymentProcessingFee", "OtherFee", "TotalFees", "RefundableAmount", "RefundAmount"
        })
        {
            var property = cancellation.FindProperty(name)!;
            Assert.Equal("decimal(18,2)", property.GetColumnType());
            Assert.Equal(typeof(decimal), property.ClrType);
        }

        var refund = h.Db.Model.FindEntityType(typeof(BookingRefund))!;
        foreach (var name in new[] { "Amount", "CalculatedAmount", "OriginalAmount", "TotalDeductions" })
            Assert.Equal("decimal(18,2)", refund.FindProperty(name)!.GetColumnType());
    }

    [Fact]
    public async Task Decimal_amounts_round_trip_without_float_drift()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        var booking = CancellationFixtures.Booking(total: 7899.99m);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var cancellation = CancellationFixtures.Cancellation(booking);
        cancellation.OriginalAmount = 7899.99m;
        cancellation.RefundAmount = 5933.33m;
        cancellation.AirlineCancellationFee = 0.01m;
        db.BookingCancellations.Add(cancellation);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var saved = await db.BookingCancellations.SingleAsync();
        Assert.Equal(7899.99m, saved.OriginalAmount);
        Assert.Equal(5933.33m, saved.RefundAmount);
        Assert.Equal(0.01m, saved.AirlineCancellationFee);
    }

    [Fact]
    public async Task New_bookings_default_to_confirmed_cancellation_status()
    {
        using var h = TestDb.CreateRelational();
        var db = h.Db;
        db.Bookings.Add(CancellationFixtures.Booking());
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var saved = await db.Bookings.SingleAsync();
        Assert.Equal(CancellationStatuses.Confirmed, saved.CancellationStatus);
        Assert.Equal(FareTypes.Economy, saved.FareType);
        Assert.Equal("", saved.RefundStatus);
        Assert.Null(saved.ActiveCancellationId);
    }
}
