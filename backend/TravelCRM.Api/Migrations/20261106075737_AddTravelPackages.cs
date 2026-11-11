using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelCRM.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTravelPackages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TravelPackages",
                columns: table => new
                {
                    TravelPackageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PackageCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    PackageName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Destination = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PackageType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DurationDays = table.Column<int>(type: "int", nullable: false),
                    DurationNights = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    BasePrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    AdultPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ChildPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    CoverImageUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TravelPackages", x => x.TravelPackageId);
                    table.ForeignKey(
                        name: "FK_TravelPackages_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PackageExclusions",
                columns: table => new
                {
                    ExclusionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TravelPackageId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PackageExclusions", x => x.ExclusionId);
                    table.ForeignKey(
                        name: "FK_PackageExclusions_TravelPackages_TravelPackageId",
                        column: x => x.TravelPackageId,
                        principalTable: "TravelPackages",
                        principalColumn: "TravelPackageId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PackageImages",
                columns: table => new
                {
                    PackageImageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TravelPackageId = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    PublicId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    CleanupPending = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PackageImages", x => x.PackageImageId);
                    table.ForeignKey(
                        name: "FK_PackageImages_TravelPackages_TravelPackageId",
                        column: x => x.TravelPackageId,
                        principalTable: "TravelPackages",
                        principalColumn: "TravelPackageId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PackageInclusions",
                columns: table => new
                {
                    InclusionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TravelPackageId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PackageInclusions", x => x.InclusionId);
                    table.ForeignKey(
                        name: "FK_PackageInclusions_TravelPackages_TravelPackageId",
                        column: x => x.TravelPackageId,
                        principalTable: "TravelPackages",
                        principalColumn: "TravelPackageId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PackageItinerary",
                columns: table => new
                {
                    ItineraryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TravelPackageId = table.Column<int>(type: "int", nullable: false),
                    DayNumber = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Accommodation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    MealsIncluded = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PackageItinerary", x => x.ItineraryId);
                    table.CheckConstraint("CK_PackageItinerary_DayNumber", "[DayNumber] > 0");
                    table.ForeignKey(
                        name: "FK_PackageItinerary_TravelPackages_TravelPackageId",
                        column: x => x.TravelPackageId,
                        principalTable: "TravelPackages",
                        principalColumn: "TravelPackageId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PackageExclusions_TravelPackageId",
                table: "PackageExclusions",
                column: "TravelPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PackageImages_TravelPackageId_DisplayOrder",
                table: "PackageImages",
                columns: new[] { "TravelPackageId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_PackageImages_TravelPackageId_IsPrimary",
                table: "PackageImages",
                columns: new[] { "TravelPackageId", "IsPrimary" },
                unique: true,
                filter: "[IsPrimary] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_PackageInclusions_TravelPackageId",
                table: "PackageInclusions",
                column: "TravelPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PackageItinerary_TravelPackageId_DayNumber",
                table: "PackageItinerary",
                columns: new[] { "TravelPackageId", "DayNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TravelPackages_CreatedByUserId",
                table: "TravelPackages",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TravelPackages_IsActive_Destination",
                table: "TravelPackages",
                columns: new[] { "IsActive", "Destination" });

            migrationBuilder.CreateIndex(
                name: "IX_TravelPackages_PackageCode",
                table: "TravelPackages",
                column: "PackageCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TravelPackages_PackageType_DurationDays",
                table: "TravelPackages",
                columns: new[] { "PackageType", "DurationDays" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PackageExclusions");

            migrationBuilder.DropTable(
                name: "PackageImages");

            migrationBuilder.DropTable(
                name: "PackageInclusions");

            migrationBuilder.DropTable(
                name: "PackageItinerary");

            migrationBuilder.DropTable(
                name: "TravelPackages");
        }
    }
}
