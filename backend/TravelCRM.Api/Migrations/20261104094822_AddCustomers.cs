using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelCRM.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[dbo].[Customers]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[Customers]
                    (
                        [CustomerId] int IDENTITY(1,1) NOT NULL,
                        [FullName] nvarchar(150) NOT NULL,
                        [Email] nvarchar(150) NOT NULL,
                        [Phone] nvarchar(20) NOT NULL,
                        [DateOfBirth] date NULL,
                        [Gender] nvarchar(20) NULL,
                        [Address] nvarchar(500) NULL,
                        [CreatedByUserId] int NOT NULL,
                        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_Customers_CreatedAt] DEFAULT SYSUTCDATETIME(),
                        [UpdatedAt] datetime2 NULL,
                        [IsActive] bit NOT NULL CONSTRAINT [DF_Customers_IsActive] DEFAULT (1),
                        CONSTRAINT [PK_Customers] PRIMARY KEY ([CustomerId]),
                        CONSTRAINT [FK_Customers_Users_CreatedByUserId]
                            FOREIGN KEY ([CreatedByUserId]) REFERENCES [dbo].[Users] ([UserId])
                    );
                END;

                IF NOT EXISTS
                (
                    SELECT 1
                    FROM sys.indexes i
                    INNER JOIN sys.index_columns ic
                        ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
                    INNER JOIN sys.columns c
                        ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                    WHERE i.object_id = OBJECT_ID(N'[dbo].[Customers]')
                        AND i.is_unique = 1
                        AND c.name = N'Email'
                )
                BEGIN
                    CREATE UNIQUE INDEX [IX_Customers_Email]
                        ON [dbo].[Customers] ([Email]);
                END;

                IF NOT EXISTS
                (
                    SELECT 1
                    FROM sys.indexes i
                    INNER JOIN sys.index_columns ic
                        ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
                    INNER JOIN sys.columns c
                        ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                    WHERE i.object_id = OBJECT_ID(N'[dbo].[Customers]')
                        AND i.is_hypothetical = 0
                        AND c.name = N'CreatedByUserId'
                )
                BEGIN
                    CREATE INDEX [IX_Customers_CreatedByUserId]
                        ON [dbo].[Customers] ([CreatedByUserId]);
                END;

                IF NOT EXISTS
                (
                    SELECT 1
                    FROM sys.foreign_key_columns fkc
                    WHERE fkc.parent_object_id = OBJECT_ID(N'[dbo].[Customers]')
                        AND fkc.parent_column_id = COLUMNPROPERTY(OBJECT_ID(N'[dbo].[Customers]'), N'CreatedByUserId', 'ColumnId')
                        AND fkc.referenced_object_id = OBJECT_ID(N'[dbo].[Users]')
                        AND fkc.referenced_column_id = COLUMNPROPERTY(OBJECT_ID(N'[dbo].[Users]'), N'UserId', 'ColumnId')
                )
                BEGIN
                    ALTER TABLE [dbo].[Customers] WITH CHECK
                    ADD CONSTRAINT [FK_Customers_Users_CreatedByUserId]
                        FOREIGN KEY ([CreatedByUserId]) REFERENCES [dbo].[Users] ([UserId]);
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
