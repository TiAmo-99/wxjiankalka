# Copy product images -> website/static-test/images/products/
# Run: website\scripts\copy-product-images.bat
# Or:  powershell -ExecutionPolicy Bypass -File website\scripts\copy-product-images.ps1
# Or:  python website\scripts\copy-product-images.py [optional source path]

param(
    [string]$SourceDir = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$parent = Split-Path $repoRoot -Parent
$productFolder = -join (@(0x4ea7, 0x54c1, 0x56fe, 0x7247) | ForEach-Object { [char]$_ })

$srcCandidates = @()
if ($SourceDir) {
    $srcCandidates += $SourceDir
}
$srcCandidates += @(
    (Join-Path $repoRoot $productFolder),
    (Join-Path $repoRoot "2026_06_04_3-小功率直流桩"),
    (Join-Path $parent $productFolder),
    (Join-Path $parent "2026_06_04_3-小功率直流桩")
)

$srcRoot = $null
foreach ($c in $srcCandidates) {
    if (-not $c) { continue }
    $resolved = [System.IO.Path]::GetFullPath($c)
    if (Test-Path -LiteralPath $resolved) {
        $srcRoot = $resolved
        break
    }
}

if (-not $srcRoot) {
    Write-Host "Source folder not found. Tried:" -ForegroundColor Red
    foreach ($c in $srcCandidates) { Write-Host "  $c" }
    Write-Host ""
    Write-Host "Put images in: $repoRoot\$productFolder" -ForegroundColor Yellow
    Write-Host "Or run: python website\scripts\copy-product-images.py `"D:\your\path`"" -ForegroundColor Yellow
    exit 1
}

Write-Host "Source: $srcRoot"

$dst = Join-Path $repoRoot "website\static-test\images\products"
New-Item -ItemType Directory -Force -Path $dst | Out-Null

$maps = @(
    @{ Rel = "9-交流桩\7kW个人有序交流充电桩-E3.jpg"; Dst = "ac-7kw-e3.jpg" },
    @{ Rel = "1-社会版-一体机2025\1-120-180kW一体机\中性一体机---正面.jpg"; Dst = "dc-120-180kw.jpg" },
    @{ Rel = "1-社会版-一体机2025\2-240kW-400kW重卡充电桩\lQLPJw8vB1eu1QXNDaXNE4iwbpN1EwDYUgwJlc0ZUfgoAQ_5000_3493.png"; Dst = "dc-240kw-truck.png" },
    @{ Rel = "7-全液冷主机柜\全液冷光储充放主机柜---.png"; Dst = "host-liquid-cool-cabinet.png" },
    @{ Rel = "2-社会版-四种充电终端\1-液冷充电终端-正面.png"; Dst = "terminal-liquid-cool.png" },
    @{ Rel = "3-小功率直流桩\小直流.png"; Dst = "dc-small-power.png" },
    @{ Rel = "储充一体机效果图.png"; Dst = "storage-charge-unit.png" },
    @{ Rel = "8-欧标直流桩\欧标直流桩.png"; Dst = "eu-standard-dc.png" }
)

$ok = 0
foreach ($m in $maps) {
    $from = Join-Path $srcRoot $m.Rel
    $to = Join-Path $dst $m.Dst
    if (Test-Path -LiteralPath $from) {
        Copy-Item -LiteralPath $from -Destination $to -Force
        Write-Host "  OK  $($m.Dst)" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "  SKIP: $($m.Rel)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Copied $ok / $($maps.Count) -> $dst"
Write-Host "Re-upload static-test to server."
