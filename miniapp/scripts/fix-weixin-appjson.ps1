# 编译后若 app.json 仍含错误的 requiredPrivateInfos（蓝牙 API），运行本脚本清除。
# 用法：在 miniapp 目录执行  powershell -File scripts/fix-weixin-appjson.ps1

$paths = @(
  "unpackage/dist/dev/mp-weixin/app.json",
  "unpackage/dist/build/mp-weixin/app.json"
)

$allowed = @(
  "chooseAddress", "chooseLocation", "choosePoi", "getFuzzyLocation", "getLocation",
  "onLocationChange", "startLocationUpdate", "startLocationUpdateBackground"
)

foreach ($rel in $paths) {
  $file = Join-Path $PSScriptRoot ".." $rel
  if (-not (Test-Path $file)) { continue }

  $raw = Get-Content $file -Raw -Encoding UTF8
  $json = $raw | ConvertFrom-Json
  $list = @($json.requiredPrivateInfos)
  if ($list.Count -eq 0) {
    Write-Host "OK (no requiredPrivateInfos): $rel"
    continue
  }

  $invalid = $list | Where-Object { $_ -notin $allowed }
  if ($invalid.Count -eq 0) {
    Write-Host "OK (location only): $rel"
    continue
  }

  $json.PSObject.Properties.Remove("requiredPrivateInfos")
  $json | ConvertTo-Json -Depth 50 | Set-Content $file -Encoding UTF8
  Write-Host "FIXED removed invalid requiredPrivateInfos from $rel"
  Write-Host "  removed: $($invalid -join ', ')"
}
