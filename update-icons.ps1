# SmartCare PHR - Android Icon Update Script
# This script copies your new icons to all Android mipmap folders

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   SmartCare PHR - Icon Update Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if source files exist
$sourceIcon = "src\assets\images\ic_launcher.png"
$sourceForeground = "src\assets\images\ic_launcher_foreground.png"

if (-not (Test-Path $sourceIcon)) {
    Write-Host "❌ Error: $sourceIcon not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $sourceForeground)) {
    Write-Host "❌ Error: $sourceForeground not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found source files:" -ForegroundColor Green
Write-Host "   - $sourceIcon" -ForegroundColor Gray
Write-Host "   - $sourceForeground" -ForegroundColor Gray
Write-Host ""

# Android density folders
$densities = @("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")
$basePath = "android\app\src\main\res"

Write-Host "📱 Updating Android launcher icons..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$totalFiles = $densities.Count * 2

foreach ($density in $densities) {
    $targetFolder = "$basePath\mipmap-$density"
    
    # Create folder if it doesn't exist
    if (-not (Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    }
    
    # Copy main launcher icon
    try {
        Copy-Item $sourceIcon "$targetFolder\ic_launcher.png" -Force
        Write-Host "✅ Copied to mipmap-$density/ic_launcher.png" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "❌ Failed to copy to mipmap-$density/ic_launcher.png" -ForegroundColor Red
    }
    
    # Copy foreground icon
    try {
        Copy-Item $sourceForeground "$targetFolder\ic_launcher_foreground.png" -Force
        Write-Host "✅ Copied to mipmap-$density/ic_launcher_foreground.png" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "❌ Failed to copy to mipmap-$density/ic_launcher_foreground.png" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Update Complete: $successCount/$totalFiles files copied" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($successCount -eq $totalFiles) {
    Write-Host "All icons updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Clean build: cd android && .\gradlew clean && cd .." -ForegroundColor White
    Write-Host "   2. Uninstall app: adb uninstall com.sus" -ForegroundColor White
    Write-Host "   3. Rebuild app: npm run android" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: This uses the same image for all densities." -ForegroundColor Yellow
    Write-Host "For production, use Android Studio Image Asset Studio." -ForegroundColor Yellow
}
else {
    Write-Host "Some files failed to copy. Check errors above." -ForegroundColor Yellow
}

Write-Host ""
