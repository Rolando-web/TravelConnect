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
    public DbSet<Image> Images => Set<Image>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

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
        modelBuilder.Entity<Image>().Property(i => i.Data).HasColumnType("varbinary(max)");
        modelBuilder.Entity<Image>().Property(i => i.ContentType).HasMaxLength(64);
        modelBuilder.Entity<SubscriptionPlan>().Property(p => p.MonthlyPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Subscription>().Property(s => s.MonthlyPrice).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Package>().HasOne(p => p.Supplier).WithMany().HasForeignKey(p => p.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Flight>().HasOne(f => f.Supplier).WithMany().HasForeignKey(f => f.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Hotel>().HasOne(h => h.Supplier).WithMany().HasForeignKey(h => h.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Car>().HasOne(c => c.Supplier).WithMany().HasForeignKey(c => c.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Activity>().HasOne(a => a.Supplier).WithMany().HasForeignKey(a => a.SupplierId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Payment>().HasOne(p => p.Booking).WithMany().HasForeignKey(p => p.BookingId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<BookingFlight>().HasOne(f => f.Booking).WithMany(b => b.BookingFlights).HasForeignKey(f => f.BookingId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<EmailLog>().HasOne(e => e.Booking).WithMany().HasForeignKey(e => e.BookingId).OnDelete(DeleteBehavior.SetNull);
    }
}
