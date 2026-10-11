$ErrorActionPreference = 'Continue'

docker info *> $null
if ($LASTEXITCODE -eq 0) {
    exit 0
}

Write-Output 'Docker daemon not running, starting Docker Desktop...'
Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

$elapsed = 0
$timeoutSeconds = 120
while ($elapsed -lt $timeoutSeconds) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        exit 0
    }
    Start-Sleep -Seconds 5
    $elapsed += 5
}

Write-Error 'Timed out waiting for Docker Desktop to start'
exit 1
