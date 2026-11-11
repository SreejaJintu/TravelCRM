$ErrorActionPreference = "Stop"

$apiDirectory = Join-Path $PSScriptRoot "backend\TravelCRM.Api"
$frontendDirectory = Join-Path $PSScriptRoot "frontend"
$apiUrl = "http://localhost:5030/swagger/v1/swagger.json"

function Get-ApiSwagger {
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 2 -SkipHttpErrorCheck
        if ([int]$response.StatusCode -ne 200) {
            return $null
        }

        return $response.Content | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Test-TravelCrmFrontend([int]$Port) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -TimeoutSec 2 -SkipHttpErrorCheck
        return [int]$response.StatusCode -eq 200 -and
            $response.Content.Contains('<div id="root"></div>') -and
            $response.Content.Contains('/src/main.jsx')
    } catch {
        return $false
    }
}

$apiSwagger = Get-ApiSwagger
$apiHasLeads = $null -ne $apiSwagger -and
    $null -ne $apiSwagger.paths.PSObject.Properties['/api/Leads']

if ($apiHasLeads) {
    Write-Host "Current Travel CRM API is responding at http://localhost:5030."
} else {
    $apiListeners = Get-NetTCPConnection -LocalPort 5030 -State Listen -ErrorAction SilentlyContinue
    if ($apiListeners) {
        if ($null -ne $apiSwagger) {
            Write-Warning "An older API is responding on port 5030, but its Swagger document does not include /api/Leads. Stop that API manually, rebuild, and rerun this script. No process was terminated or started."
        } else {
            Write-Warning "Port 5030 is occupied, but Swagger is unavailable. No process was terminated or started."
        }
    } else {
        Start-Process -FilePath "dotnet.exe" `
            -ArgumentList @("run", "--launch-profile", "http") `
            -WorkingDirectory $apiDirectory
        Write-Host "Started Travel CRM API using the HTTP launch profile on port 5030."
    }
}

$frontendPort = $null
foreach ($port in 5173..5200) {
    if (Test-TravelCrmFrontend $port) {
        $frontendPort = $port
        break
    }
}

if ($null -ne $frontendPort) {
    Write-Host "Travel CRM frontend is already responding at http://127.0.0.1:$frontendPort/."
} else {
    Start-Process -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev") `
        -WorkingDirectory $frontendDirectory
    Write-Host "Started the Vite development server. Check its window for the selected localhost port."
}