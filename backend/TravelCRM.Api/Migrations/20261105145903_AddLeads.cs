using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelCRM.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLeads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Leads",
                columns: table => new
                {
                    LeadId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LeadNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Destination = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    TravelStartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    TravelEndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    NumberOfAdults = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    NumberOfChildren = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    Budget = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    LeadSource = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LeadStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "New"),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    AssignedToUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    ConvertedCustomerId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConvertedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leads", x => x.LeadId);
                    table.ForeignKey(
                        name: "FK_Leads_Customers_ConvertedCustomerId",
                        column: x => x.ConvertedCustomerId,
                        principalTable: "Customers",
                        principalColumn: "CustomerId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Leads_Users_AssignedToUserId",
                        column: x => x.AssignedToUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Leads_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Leads_AssignedToUserId",
                table: "Leads",
                column: "AssignedToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_ConvertedCustomerId",
                table: "Leads",
                column: "ConvertedCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_CreatedByUserId",
                table: "Leads",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_IsActive_LeadStatus",
                table: "Leads",
                columns: new[] { "IsActive", "LeadStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_Leads_LeadNumber",
                table: "Leads",
                column: "LeadNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Leads");
        }
    }
}
