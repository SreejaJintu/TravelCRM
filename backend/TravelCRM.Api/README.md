# Travel package image configuration

Travel package images are stored in Cloudinary. SQL Server stores only the secure
delivery URL, Cloudinary public ID, ordering, and primary-image metadata.

Configure these backend environment variables before starting the API:

```powershell
$env:Cloudinary__CloudName = "<cloud-name>"
$env:Cloudinary__ApiKey = "<api-key>"
$env:Cloudinary__ApiSecret = "<api-secret>"
```

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
