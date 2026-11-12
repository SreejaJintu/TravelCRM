# Travel package image configuration

Travel package images are stored in Cloudinary. SQL Server stores only the secure
delivery URL, Cloudinary public ID, ordering, and primary-image metadata.

Configure these backend environment variables before starting the API:

```powershell
$env:Cloudinary__CloudName = "<cloud-name>"
$env:Cloudinary__ApiKey = "<api-key>"
$env:Cloudinary__ApiSecret = "<api-secret>"
```

## Production configuration

Set `ASPNETCORE_ENVIRONMENT=Production` and configure these environment
variables in the hosting control panel. Do not put production credentials in
`appsettings.json`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ConnectionStrings__DefaultConnection` | Yes | MonsterASP SQL Server connection string |
| `Jwt__Key` | Yes | JWT signing key; at least 32 UTF-8 bytes |
| `Jwt__Issuer` | Yes | JWT issuer |
| `Jwt__Audience` | Yes | JWT audience |
| `Cors__AllowedOrigins` | Yes | Comma-separated HTTPS frontend origin(s), without paths |
| `Cloudinary__CloudName` | For image uploads | Cloudinary cloud name |
| `Cloudinary__ApiKey` | For image uploads | Cloudinary API key |
| `Cloudinary__ApiSecret` | For image uploads | Cloudinary API secret |
| `Swagger__Enabled` | No | Set to `true` only to expose Swagger in Production |
| `Jwt__ExpiryMinutes` | No | JWT lifetime in minutes; defaults to 60 |

Development continues to allow localhost and 127.0.0.1 origins. Production
allows only the origins in `Cors__AllowedOrigins`. `/health` reports application
and database connectivity without returning connection details. HTTPS
redirection is enabled.

The API does not apply migrations at startup. The repository currently contains
eight migrations, from `20261103133215_CreateAuthenticationTables` through
`20261107065716_AddPayments`. Applied-vs-pending status on the MonsterASP
database has not been checked; `dotnet ef migrations list --no-connect` lists
the code migrations but cannot determine which are applied. Do not run
`dotnet ef database update` against a restored production database without
review and explicit approval.

The Cloudinary API secret must remain server-side. Do not put these values in
frontend configuration or commit actual credentials. Cloudinary image requests
are placed in `travelcrm/packages/{packageCode}`. The maximum individual file
size defaults to 5 MiB and can be changed through `PackageImages:MaxFileSizeBytes`
in backend configuration.

The API refuses image operations when Cloudinary is not configured; package
catalog APIs remain available. Failed image deletion leaves a cleanup-pending
database record that can be retried through the same image DELETE endpoint.
If cleanup of an upload fails before SQL metadata was saved, the API log includes
the Cloudinary public ID; remove that specific asset from the Cloudinary Media
Library after verifying the package and upload request.

Apply the SQL Server migration from this project directory:

```powershell
dotnet ef database update
```

## Booking management

The additive `AddBookings` migration creates `Bookings` and `BookingTravelers`;
it references the existing customer, lead, travel-package, and user tables.
Bookings use the `Inquiry`, `Quotation`, `Pending`, `Confirmed`, `Cancelled`,
and `Completed` workflow. Staff access is scoped to bookings they created, are
assigned to, or can access through existing customer/lead ownership.

The API is rooted at `/api/Bookings`. Prices are snapshotted from the active
travel package on the server: adult, child, and infant rates use the package's
current prices, and discounts cannot exceed the computed base amount.
Client-submitted totals and rates are not accepted. Booking price snapshots
remain independent from later package price edits; editing an existing booking
uses its saved unit prices unless an editable booking is explicitly changed to
a different package. Lead conversion uses `POST /api/Bookings/from-lead/{leadId}`
and updates the lead and booking in one database transaction while reusing an
already linked or matching customer.

Traveler identity details are optional; passport information is not collected.
Payment records and booking history are not currently supported.
