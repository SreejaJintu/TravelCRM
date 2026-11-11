using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelCRM.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInfantPackagePrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "InfantPrice",
                table: "TravelPackages",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InfantPrice",
                table: "TravelPackages");
        }
    }
}
