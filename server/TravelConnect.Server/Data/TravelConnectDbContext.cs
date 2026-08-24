using Microsoft.EntityFrameworkCore;

namespace TravelConnect.Server.Data;

public class TravelConnectDbContext : DbContext
{
    public TravelConnectDbContext(
        DbContextOptions<TravelConnectDbContext> options)
        : base(options)
    {
    }

    public DbSet<Models.Customer> Customers { get; set; } = null!;
    public DbSet<Models.Package> Packages { get; set; } = null!;
    public DbSet<Models.Booking> Bookings { get; set; } = null!;
    public DbSet<Models.PaymentTransaction> PaymentTransactions { get; set; } = null!;
    public DbSet<Models.PromoCode> PromoCodes { get; set; } = null!;
    public DbSet<Models.CustomerInquiry> CustomerInquiries { get; set; } = null!;
}