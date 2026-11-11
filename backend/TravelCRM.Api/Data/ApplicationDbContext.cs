using Microsoft.EntityFrameworkCore;
using TravelCRM.Api.Models;

namespace TravelCRM.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<Lead> Leads => Set<Lead>();

    public DbSet<FollowUp> FollowUps => Set<FollowUp>();

    public DbSet<TravelPackage> TravelPackages => Set<TravelPackage>();

    public DbSet<Booking> Bookings => Set<Booking>();

    public DbSet<BookingTraveler> BookingTravelers => Set<BookingTraveler>();

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<PackageItinerary> PackageItinerary => Set<PackageItinerary>();

    public DbSet<PackageImage> PackageImages => Set<PackageImage>();

    public DbSet<PackageInclusion> PackageInclusions => Set<PackageInclusion>();

    public DbSet<PackageExclusion> PackageExclusions => Set<PackageExclusion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.RoleId);

            entity.Property(r => r.RoleName)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(r => r.RoleName)
                .IsUnique();

            entity.HasData(
                new Role
                {
                    RoleId = 1,
                    RoleName = "Admin"
                },
                new Role
                {
                    RoleId = 2,
                    RoleName = "Staff"
                }
            );
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.UserId);

            entity.Property(u => u.FullName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(u => u.Email)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(u => u.PasswordHash)
                .IsRequired();

            entity.HasIndex(u => u.Email)
                .IsUnique();

            entity.HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.CustomerId);

            entity.Property(c => c.FullName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(c => c.Email)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(c => c.Phone)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(c => c.DateOfBirth)
                .HasColumnType("date");

            entity.Property(c => c.Gender)
                .HasMaxLength(20);

            entity.Property(c => c.Address)
                .HasMaxLength(500);

            entity.Property(c => c.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .IsRequired();

            entity.Property(c => c.IsActive)
                .HasDefaultValue(true);

            entity.HasIndex(c => c.Email)
                .IsUnique();

            entity.HasIndex(c => c.CreatedByUserId);

            entity.HasOne(c => c.CreatedByUser)
                .WithMany()
                .HasForeignKey(c => c.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Lead>(entity =>
        {
            entity.HasKey(lead => lead.LeadId);

            entity.Property(lead => lead.LeadNumber)
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(lead => lead.FullName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(lead => lead.Phone)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(lead => lead.Email)
                .HasMaxLength(150);

            entity.Property(lead => lead.Destination)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(lead => lead.TravelStartDate)
                .HasColumnType("date");

            entity.Property(lead => lead.TravelEndDate)
                .HasColumnType("date");

            entity.Property(lead => lead.NumberOfAdults)
                .HasDefaultValue(1);

            entity.Property(lead => lead.NumberOfChildren)
                .HasDefaultValue(0);

            entity.Property(lead => lead.Budget)
                .HasPrecision(18, 2);

            entity.Property(lead => lead.LeadSource)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(lead => lead.LeadStatus)
                .HasMaxLength(20)
                .HasDefaultValue(LeadStatuses.New)
                .IsRequired();

            entity.Property(lead => lead.Notes)
                .HasMaxLength(1000);

            entity.Property(lead => lead.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .IsRequired();

            entity.Property(lead => lead.IsActive)
                .HasDefaultValue(true);

            entity.HasIndex(lead => lead.LeadNumber)
                .IsUnique();

            entity.HasIndex(lead => lead.CreatedByUserId);
            entity.HasIndex(lead => lead.AssignedToUserId);
            entity.HasIndex(lead => new { lead.IsActive, lead.LeadStatus });

            entity.HasOne(lead => lead.CreatedByUser)
                .WithMany()
                .HasForeignKey(lead => lead.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(lead => lead.AssignedToUser)
                .WithMany()
                .HasForeignKey(lead => lead.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(lead => lead.ConvertedCustomer)
                .WithMany()
                .HasForeignKey(lead => lead.ConvertedCustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<FollowUp>(entity =>
        {
            entity.HasKey(followUp => followUp.FollowUpId);

            entity.Property(followUp => followUp.FollowUpType)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(followUp => followUp.Subject)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(followUp => followUp.Description)
                .HasMaxLength(1000);

            entity.Property(followUp => followUp.ScheduledAt)
                .HasColumnType("datetimeoffset")
                .IsRequired();

            entity.Property(followUp => followUp.Status)
                .HasMaxLength(20)
                .HasDefaultValue(FollowUpStatuses.Pending)
                .IsRequired();

            entity.Property(followUp => followUp.Outcome)
                .HasMaxLength(1000);

            entity.Property(followUp => followUp.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .IsRequired();

            entity.Property(followUp => followUp.IsActive)
                .HasDefaultValue(true);

            entity.HasIndex(followUp => new { followUp.AssignedToUserId, followUp.ScheduledAt });
            entity.HasIndex(followUp => new { followUp.LeadId, followUp.ScheduledAt });
            entity.HasIndex(followUp => new { followUp.Status, followUp.ScheduledAt });

            entity.HasOne(followUp => followUp.Lead)
                .WithMany()
                .HasForeignKey(followUp => followUp.LeadId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(followUp => followUp.AssignedToUser)
                .WithMany()
                .HasForeignKey(followUp => followUp.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(followUp => followUp.CreatedByUser)
                .WithMany()
                .HasForeignKey(followUp => followUp.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TravelPackage>(entity =>
        {
            entity.HasKey(package => package.TravelPackageId);
            entity.Property(package => package.PackageCode).HasMaxLength(32).IsRequired();
            entity.Property(package => package.PackageName).HasMaxLength(150).IsRequired();
            entity.Property(package => package.Destination).HasMaxLength(150).IsRequired();
            entity.Property(package => package.Country).HasMaxLength(100).IsRequired();
            entity.Property(package => package.PackageType).HasMaxLength(50).IsRequired();
            entity.Property(package => package.Description).HasMaxLength(4000).IsRequired();
            entity.Property(package => package.BasePrice).HasPrecision(18, 2);
            entity.Property(package => package.AdultPrice).HasPrecision(18, 2);
            entity.Property(package => package.ChildPrice).HasPrecision(18, 2);
            entity.Property(package => package.InfantPrice).HasPrecision(18, 2).HasDefaultValue(0m);
            entity.Property(package => package.Currency).HasMaxLength(3).IsRequired();
            entity.Property(package => package.CoverImageUrl).HasMaxLength(2048);
            entity.Property(package => package.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()").IsRequired();
            entity.Property(package => package.IsActive).HasDefaultValue(true);
            entity.HasIndex(package => package.PackageCode).IsUnique();
            entity.HasIndex(package => new { package.IsActive, package.Destination });
            entity.HasIndex(package => new { package.PackageType, package.DurationDays });
            entity.HasOne(package => package.CreatedByUser)
                .WithMany()
                .HasForeignKey(package => package.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PackageItinerary>(entity =>
        {
            entity.HasKey(item => item.ItineraryId);
            entity.ToTable("PackageItinerary", table =>
                table.HasCheckConstraint("CK_PackageItinerary_DayNumber", "[DayNumber] > 0"));
            entity.Property(item => item.Title).HasMaxLength(150).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(2000).IsRequired();
            entity.Property(item => item.Accommodation).HasMaxLength(200);
            entity.Property(item => item.MealsIncluded).HasMaxLength(200);
            entity.HasIndex(item => new { item.TravelPackageId, item.DayNumber }).IsUnique();
            entity.HasOne(item => item.TravelPackage).WithMany(package => package.Itinerary)
                .HasForeignKey(item => item.TravelPackageId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PackageImage>(entity =>
        {
            entity.HasKey(image => image.PackageImageId);
            entity.Property(image => image.ImageUrl).HasMaxLength(2048).IsRequired();
            entity.Property(image => image.PublicId).HasMaxLength(255).IsRequired();
            entity.Property(image => image.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()").IsRequired();
            entity.Property(image => image.CleanupPending).HasDefaultValue(false);
            entity.HasIndex(image => new { image.TravelPackageId, image.DisplayOrder });
            entity.HasIndex(image => new { image.TravelPackageId, image.IsPrimary })
                .IsUnique()
                .HasFilter("[IsPrimary] = 1");
            entity.HasOne(image => image.TravelPackage).WithMany(package => package.Images)
                .HasForeignKey(image => image.TravelPackageId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PackageInclusion>(entity =>
        {
            entity.HasKey(item => item.InclusionId);
            entity.Property(item => item.Description).HasMaxLength(500).IsRequired();
            entity.HasIndex(item => item.TravelPackageId);
            entity.HasOne(item => item.TravelPackage).WithMany(package => package.Inclusions)
                .HasForeignKey(item => item.TravelPackageId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PackageExclusion>(entity =>
        {
            entity.HasKey(item => item.ExclusionId);
            entity.Property(item => item.Description).HasMaxLength(500).IsRequired();
            entity.HasIndex(item => item.TravelPackageId);
            entity.HasOne(item => item.TravelPackage).WithMany(package => package.Exclusions)
                .HasForeignKey(item => item.TravelPackageId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(booking => booking.BookingId);
            entity.ToTable("Bookings", table =>
            {
                table.HasCheckConstraint(
                    "CK_Bookings_TravelDates",
                    "[TravelEndDate] >= [TravelStartDate]");
                table.HasCheckConstraint(
                    "CK_Bookings_TravelerCounts",
                    "[NumberOfAdults] >= 0 AND [NumberOfChildren] >= 0 AND [NumberOfInfants] >= 0 AND [NumberOfAdults] + [NumberOfChildren] + [NumberOfInfants] > 0");
                table.HasCheckConstraint(
                    "CK_Bookings_Amounts",
                    "[AdultPrice] >= 0 AND [ChildPrice] >= 0 AND [InfantPrice] >= 0 AND [BaseAmount] >= 0 AND [DiscountAmount] >= 0 AND [AdditionalCharges] >= 0 AND [DiscountAmount] <= [BaseAmount] AND [TotalAmount] = [BaseAmount] - [DiscountAmount] + [AdditionalCharges]");
            });
            entity.Property(booking => booking.BookingNumber).HasMaxLength(20).IsRequired();
            entity.Property(booking => booking.AdultPrice).HasPrecision(18, 2);
            entity.Property(booking => booking.ChildPrice).HasPrecision(18, 2);
            entity.Property(booking => booking.InfantPrice).HasPrecision(18, 2);
            entity.Property(booking => booking.BaseAmount).HasPrecision(18, 2);
            entity.Property(booking => booking.DiscountAmount).HasPrecision(18, 2);
            entity.Property(booking => booking.AdditionalCharges).HasPrecision(18, 2);
            entity.Property(booking => booking.TotalAmount).HasPrecision(18, 2);
            entity.Property(booking => booking.Currency).HasMaxLength(3).IsRequired();
            entity.Property(booking => booking.TravelStartDate).HasColumnType("date");
            entity.Property(booking => booking.TravelEndDate).HasColumnType("date");
            entity.Property(booking => booking.BookingStatus)
                .HasMaxLength(20)
                .HasDefaultValue(BookingStatuses.Inquiry)
                .IsRequired();
            entity.Property(booking => booking.SpecialRequests).HasMaxLength(2000);
            entity.Property(booking => booking.CreatedAt)
                .HasDefaultValueSql("SYSUTCDATETIME()")
                .IsRequired();
            entity.Property(booking => booking.IsActive).HasDefaultValue(true);
            entity.HasIndex(booking => booking.BookingNumber).IsUnique();
            entity.HasIndex(booking => booking.CustomerId);
            entity.HasIndex(booking => booking.LeadId);
            entity.HasIndex(booking => booking.TravelPackageId);
            entity.HasIndex(booking => booking.AssignedToUserId);
            entity.HasIndex(booking => new { booking.BookingStatus, booking.TravelStartDate });
            entity.HasOne(booking => booking.Customer).WithMany()
                .HasForeignKey(booking => booking.CustomerId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(booking => booking.Lead).WithMany()
                .HasForeignKey(booking => booking.LeadId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(booking => booking.TravelPackage).WithMany()
                .HasForeignKey(booking => booking.TravelPackageId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(booking => booking.AssignedToUser).WithMany()
                .HasForeignKey(booking => booking.AssignedToUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(booking => booking.CreatedByUser).WithMany()
                .HasForeignKey(booking => booking.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BookingTraveler>(entity =>
        {
            entity.HasKey(traveler => traveler.BookingTravelerId);
            entity.Property(traveler => traveler.FullName).HasMaxLength(150).IsRequired();
            entity.Property(traveler => traveler.DateOfBirth).HasColumnType("date");
            entity.Property(traveler => traveler.Gender).HasMaxLength(20);
            entity.Property(traveler => traveler.TravelerType).HasMaxLength(10).IsRequired();
            entity.HasIndex(traveler => traveler.BookingId);
            entity.HasOne(traveler => traveler.Booking).WithMany(booking => booking.Travelers)
                .HasForeignKey(traveler => traveler.BookingId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(payment => payment.PaymentId);
            entity.ToTable("Payments", table =>
                table.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0"));
            entity.Property(payment => payment.Amount).HasPrecision(18, 2).IsRequired();
            entity.Property(payment => payment.PaymentType).HasMaxLength(20).IsRequired();
            entity.Property(payment => payment.PaymentMethod).HasMaxLength(20).IsRequired();
            entity.Property(payment => payment.PaymentStatus)
                .HasMaxLength(20)
                .HasDefaultValue(PaymentStatuses.Pending)
                .IsRequired();
            entity.Property(payment => payment.PaymentDate).HasColumnType("datetimeoffset").IsRequired();
            entity.Property(payment => payment.TransactionReference).HasMaxLength(150);
            entity.Property(payment => payment.Notes).HasMaxLength(1000);
            entity.Property(payment => payment.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()").IsRequired();
            entity.HasIndex(payment => new { payment.BookingId, payment.PaymentStatus, payment.PaymentType });
            entity.HasIndex(payment => payment.PaymentDate);
            entity.HasIndex(payment => payment.PaymentMethod);
            entity.HasIndex(payment => payment.CreatedByUserId);
            entity.HasOne(payment => payment.Booking).WithMany(booking => booking.Payments)
                .HasForeignKey(payment => payment.BookingId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(payment => payment.CreatedByUser).WithMany()
                .HasForeignKey(payment => payment.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(payment => payment.UpdatedByUser).WithMany()
                .HasForeignKey(payment => payment.UpdatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
