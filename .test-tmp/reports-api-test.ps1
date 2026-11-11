$ErrorActionPreference = "Continue"
$base = "http://localhost:5030/api"

function Get-Token($email) {
    $body = @{ email = $email; password = "Password123" } | ConvertTo-Json
    (Invoke-RestMethod -Method Post -Uri "$base/Auth/login" -ContentType "application/json" -Body $body).token
}

function Call($token, $path) {
    $h = @{}
    if ($token) { $h.Authorization = "Bearer $token" }
    try {
        $r = Invoke-WebRequest -Uri "$base/$path" -Headers $h -SkipHttpErrorCheck
        return [pscustomobject]@{ Status = [int]$r.StatusCode; Body = $r.Content }
    } catch {
        return [pscustomobject]@{ Status = -1; Body = $_.Exception.Message }
    }
}

$admin = Get-Token "admin@test.com"
$staff = Get-Token "staff@test.com"
"Admin token acquired: $([bool]$admin); Staff token acquired: $([bool]$staff)"

$paths = @("Reports/bookings", "Reports/payments", "Reports/revenue", "Reports/customers", "Reports/lead-conversion")
foreach ($who in @(@("NOAUTH", $null), @("ADMIN", $admin), @("STAFF", $staff))) {
    foreach ($p in $paths) {
        $r = Call $who[1] $p
        $summary = ""
        if ($r.Status -eq 200) {
            $j = $r.Body | ConvertFrom-Json
            $summary = ($j.PSObject.Properties | Where-Object { $_.Name -in "totalCount", "totalAmount", "totalGrossPayments", "totalCompletedRefunds", "totalNetCollections" } | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join "; "
            if ($j.summary) { $summary += "summary: " + (($j.summary.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join "; ") }
        } else { $summary = $r.Body.Substring(0, [Math]::Min(150, $r.Body.Length)) }
        "{0,-7} {1,-26} HTTP {2}  {3}" -f $who[0], $p, $r.Status, $summary
    }
}
