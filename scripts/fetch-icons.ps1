# 使用 Windows 系统网络栈缓存官方图标；不修改代理或账号设置。
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$iconCache = Join-Path $projectRoot 'design\icon-sources'
[IO.Directory]::CreateDirectory($iconCache) | Out-Null
$iconBase = 'https://raw.githubusercontent.com/phosphor-icons/core/main/'
foreach ($iconName in @('gear', 'lock', 'lock-open', 'x', 'minus', 'plus')) {
    $targetFile = Join-Path $iconCache ($iconName + '.svg')
    if (-not (Test-Path -LiteralPath $targetFile)) {
        Invoke-WebRequest -Uri ($iconBase + 'assets/regular/' + $iconName + '.svg') -OutFile $targetFile -TimeoutSec 30
    }
}
$licenseFile = Join-Path $iconCache 'LICENSE.txt'
if (-not (Test-Path -LiteralPath $licenseFile)) {
    Invoke-WebRequest -Uri ($iconBase + 'LICENSE') -OutFile $licenseFile -TimeoutSec 30
}
Write-Output '官方图标和许可文件已缓存，未变更任何网络设置。'
