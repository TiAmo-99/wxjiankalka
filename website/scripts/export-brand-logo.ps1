# Export Min-4 / Min-5 SVG -> PNG for static site & sharing
# Run: powershell -ExecutionPolicy Bypass -File website\scripts\export-brand-logo.ps1

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$brand = Join-Path $repoRoot "website\static-test\images\brand"
$variants = Join-Path $brand "variants"

$exports = @(
    @{ Svg = "logo-mark.svg"; Out = "logo-mark.png"; Width = 320 },
    @{ Svg = "logo-mark-square.svg"; Out = "logo-mark-square.png"; Width = 256 },
    @{ Svg = "variants\logo-jk-min-v4.svg"; Out = "logo-jk-min-v4.png"; Width = 320 },
    @{ Svg = "variants\logo-jk-min-v5.svg"; Out = "logo-jk-min-v5.png"; Width = 320 }
)

foreach ($e in $exports) {
    $in = Join-Path $brand $e.Svg
    $out = Join-Path $brand $e.Out
    if (-not (Test-Path -LiteralPath $in)) {
        Write-Host "SKIP missing: $($e.Svg)" -ForegroundColor Yellow
        continue
    }
    npx --yes @resvg/resvg-js-cli --fit-width $e.Width $in $out | Out-Null
    Write-Host "  OK  $($e.Out) ($($e.Width)px)" -ForegroundColor Green
}

$square = Join-Path $brand "logo-mark-square.png"
$legacy = Join-Path $brand "jiankalka-logo-mark.png"
if (Test-Path -LiteralPath $square) {
    Copy-Item -LiteralPath $square -Destination $legacy -Force
    Write-Host "  OK  jiankalka-logo-mark.png (copy of square)" -ForegroundColor Green
}

Write-Host "`nDone -> $brand"
