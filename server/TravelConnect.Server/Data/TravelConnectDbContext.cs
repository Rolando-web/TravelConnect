using Microsoft.EntityFrameworkCore;
using TravelConnect.Server.Models;

namespace TravelConnect.Server.Data;

public class TravelConnectDbContext : DbContext
{
    public TravelConnectDbContext(DbContextOptions<TravelConnectDbContext> options)
        : base(options) { }

    public DbSet<Package> Packages => Set<Package>();
    public DbSet<Flight> Flights => Set<Flight>();
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<Car> Cars => Set<Car>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Destination> Destinations => Set<Destination>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingFlight> BookingFlights => Set<BookingFlight>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Inquiry> Inquiries => Set<Inquiry>();
    public DbSet<SystemUser> SystemUsers => Set<SystemUser>();
    public DbSet<SupportConversation> SupportConversations => Set<SupportConversation>();
    public DbSet<SupportMessage> SupportMessages => Set<SupportMessage>();
    public DbSet<Image> Images => Set<Image>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<BookingCancellation> BookingCancellations => Set<BookingCancellation>();
    public DbSet<BookingRefund> BookingRefunds => Set<BookingRefund>();
    public DbSet<CancellationPolicySettings> CancellationPolicySettings => Set<CancellationPolicySettings>();
    public DbSet<CancellationPolicyRule> CancellationPolicyRules => Set<CancellationPolicyRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Package>().Property(p => p.Price).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Package>().Property(p => p.Rating).HasColumnType("decimal(3,1)");
        modelBuilder.Entity<Flight>().Property(f => f.Price).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Hotel>().Property(h => h.PricePerNight).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Hotel>().Property(h => h.Rating).HasColumnType("decimal(3,1)");
        modelBuilder.Entity<Car>().Property(c => c.PricePerDay).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Activity>().Property(a => a.Price).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Activity>().Property(a => a.Rating).HasColumnType("decimal(3,1)");
        modelBuilder.Entity<Customer>().Property(c => c.TotalSpent).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Lead>().Property(l => l.Worth).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Supplier>().Property(s => s.Rating).HasColumnType("decimal(3,1)");
        modelBuilder.Entity<Booking>().Property(b => b.Subtotal).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Booking>().Property(b => b.DiscountAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Booking>().Property(b => b.TotalAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingFlight>().Property(f => f.Price).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Payment>().Property(p => p.Amount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Promotion>().Property(p => p.Discount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Booking>().Property(b => b.RefundAmount).HasColumnType("decimal(18,2)");
        // Image.Data: no explicit column type — each provider's default binary
        // mapping is already correct (varbinary(max) on SQL Server, BLOB on
        // SQLite, which the relational test suite uses to verify the schema).
        modelBuilder.Entity<Image>().Property(i => i.ContentType).HasMaxLength(64);
        modelBuilder.Entity<SubscriptionPlan>().Property(p => p.MonthlyPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Subscription>().Property(s => s.MonthlyPrice).HasColumnType("decimal(18,2)");

        // ── Cancellation / refund money columns (Phase 1) ───────────────
        // Every money field is decimal(18,2): the refund engine rounds to cents
        // and a float column would drift on a repeated add/subtract chain.
        modelBuilder.Entity<BookingCancellation>().Property(c => c.OriginalAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingCancellation>().Property(c => c.AirlineCancellationFee).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingCancellation>().Property(c => c.AgencyServiceFee).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingCancellation>().Property(c => c.PaymentProcessingFee).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingCancellation>().Property(c => c.OtherFee).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingCancellation>().Property(c => c.TotalFees).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingCancellation>().Property(c => c.RefundableAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingCancellation>().Property(c => c.RefundAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingRefund>().Property(r => r.Amount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingRefund>().Property(r => r.CalculatedAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingRefund>().Property(r => r.OriginalAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<BookingRefund>().Property(r => r.TotalDeductions).HasColumnType("decimal(18,2)");

        // Hard money guards at the schema level: a negative refund/amount is
        // never a legitimate row, so the database rejects it outright even if a
        // future code path forgets to clamp.
        modelBuilder.Entity<BookingCancellation>().ToTable(t =>
        {
            t.HasCheckConstraint("CK_BookingCancellations_NonNegative",
                "[RefundAmount] >= 0 AND [RefundableAmount] >= 0 AND [OriginalAmount] >= 0");
            // The status vocabulary is pinned in the database, generated from
            // the C# list so the two can never drift.
            t.HasCheckConstraint("CK_BookingCancellations_Status",
                CancellationStatuses.CheckConstraintSql());
        });
        modelBuilder.Entity<BookingRefund>().ToTable(t =>
        {
            t.HasCheckConstraint("CK_BookingRefunds_NonNegative",
                "[Amount] >= 0 AND [CalculatedAmount] >= 0");
            t.HasCheckConstraint("CK_BookingRefunds_Status",
                RefundStatuses.CheckConstraintSql());
        });

        modelBuilder.Entity<Package>().HasOne(p => p.Supplier).WithMany().HasForeignKey(p => p.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Flight>().HasOne(f => f.Supplier).WithMany().HasForeignKey(f => f.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Hotel>().HasOne(h => h.Supplier).WithMany().HasForeignKey(h => h.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Car>().HasOne(c => c.Supplier).WithMany().HasForeignKey(c => c.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Activity>().HasOne(a => a.Supplier).WithMany().HasForeignKey(a => a.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Payment>().HasOne(p => p.Booking).WithMany().HasForeignKey(p => p.BookingId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<BookingFlight>().HasOne(f => f.Booking).WithMany(b => b.BookingFlights).HasForeignKey(f => f.BookingId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<EmailLog>().HasOne(e => e.Booking).WithMany().HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.SetNull);

        // Booking owns its cancellation requests, and a cancellation owns its
        // refund — deleting a booking (rare, and blocked by the controller once a
        // refund exists) must never leave orphaned financial rows behind.
        modelBuilder.Entity<BookingCancellation>()
            .HasOne(c => c.Booking).WithMany(b => b.Cancellations)
            .HasForeignKey(c => c.BookingId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<BookingRefund>()
            .HasOne(r => r.Cancellation).WithMany(c => c.Refunds)
            .HasForeignKey(r => r.CancellationId).OnDelete(DeleteBehavior.Cascade);
        // Deliberately NOT cascading from Bookings: a refund is a financial
        // record, so the FK blocks deleting a booking that has already been
        // settled (two cascading paths to BookingRefunds is also a SQL Server
        // "multiple cascade paths" error, which this avoids).
        modelBuilder.Entity<BookingRefund>()
            .HasOne(r => r.Booking).WithMany()
            .HasForeignKey(r => r.BookingId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<BookingRefund>()
            .HasOne(r => r.Payment).WithMany()
            .HasForeignKey(r => r.PaymentId).OnDelete(DeleteBehavior.SetNull);
        // Booking.ActiveCancellationId is intentionally NOT an FK: a second
        // Bookings -> BookingCancellations edge would point into a table that
        // already cascades from Bookings (an FK cycle SQL Server rejects). It is
        // a soft pointer, denormalised purely for fast list filtering.

        // Indexes for the hot lookup/filter/order paths (Phase 4). EF Core
        // already indexes FK columns via convention, so only non-FK filters
        // and joins/lookups are declared here. In-memory providers ignore
        // these — they only apply to SQL Server via EnsureCreated/Migrations.
        modelBuilder.Entity<Lead>().HasIndex(l => l.Email);
        modelBuilder.Entity<Inquiry>().HasIndex(i => i.CustomerEmail);
        modelBuilder.Entity<Inquiry>().HasIndex(i => new { i.Category, i.Status });
        modelBuilder.Entity<SupportConversation>().HasIndex(c => c.CustomerEmail);
        modelBuilder.Entity<SupportConversation>().HasIndex(c => new { c.Status, c.Category });
        modelBuilder.Entity<SupportConversation>().HasIndex(c => new { c.AssigneeEmail, c.Status });
        modelBuilder.Entity<Booking>().HasIndex(b => b.ReferenceNumber);
        modelBuilder.Entity<Booking>().HasIndex(b => new { b.CustomerEmail, b.Status });
        modelBuilder.Entity<Payment>().HasIndex(p => p.ReferenceId);
        modelBuilder.Entity<Payment>().HasIndex(p => new { p.Status, p.Method });
        modelBuilder.Entity<EmailLog>().HasIndex(e => new { e.Type, e.SentAt });
        modelBuilder.Entity<SupportMessage>().HasIndex(m => new { m.SupportConversationId, m.CreatedAt });

        // Cancellation / refund lookup paths (admin queue, customer status
        // tracker, duplicate-refund guard).
        modelBuilder.Entity<BookingCancellation>().HasIndex(c => c.Reference).IsUnique();
        modelBuilder.Entity<BookingCancellation>().HasIndex(c => new { c.Status, c.CreatedAt });
        modelBuilder.Entity<BookingCancellation>().HasIndex(c => new { c.CustomerEmail, c.Status });
        modelBuilder.Entity<BookingRefund>().HasIndex(r => r.Reference).IsUnique();
        // One live refund per booking: the filtered unique index is the last
        // line of defence against a double refund if two requests race.
        modelBuilder.Entity<BookingRefund>()
            .HasIndex(r => r.BookingId)
            .IsUnique()
            .HasFilter("[Status] <> 'Voided'");
        modelBuilder.Entity<BookingRefund>().HasIndex(r => new { r.Status, r.CreatedAt });
        modelBuilder.Entity<BookingRefund>().HasIndex(r => r.CancellationId);
        modelBuilder.Entity<Booking>().HasIndex(b => b.CancellationStatus);

        // Policy configuration: money columns are decimal, and only one settings
        // row may be active (the resolution service reads that single row).
        modelBuilder.Entity<CancellationPolicySettings>()
            .Property(s => s.MaxRefundOverridePercent).HasColumnType("decimal(5,2)");
        modelBuilder.Entity<CancellationPolicyRule>().Property(r => r.AirlineFeePercent).HasColumnType("decimal(5,2)");
        modelBuilder.Entity<CancellationPolicyRule>().Property(r => r.AirlineFeeAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<CancellationPolicyRule>().Property(r => r.AgencyServiceFee).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<CancellationPolicyRule>().Property(r => r.PaymentProcessingFee).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<CancellationPolicyRule>().Property(r => r.OtherFee).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<CancellationPolicyRule>().ToTable(t =>
        {
            t.HasCheckConstraint("CK_CancellationPolicyRules_RefundPercentage",
                "[RefundPercentage] >= 0 AND [RefundPercentage] <= 100");
            t.HasCheckConstraint("CK_CancellationPolicyRules_Tier", PolicyTiers.CheckConstraintSql("PolicyTier"));
        });
        modelBuilder.Entity<CancellationPolicySettings>().ToTable(t =>
        {
            t.HasCheckConstraint("CK_CancellationPolicySettings_GracePeriod", "[GracePeriodHours] >= 0");
        });
        modelBuilder.Entity<CancellationPolicySettings>().HasIndex(s => s.IsActive);
        modelBuilder.Entity<CancellationPolicyRule>().HasIndex(r => new { r.IsActive, r.PolicyTier, r.Priority });
    }
}
