# React Native DevTools Setup Script
# Run this script to properly connect React DevTools to your app

Write-Host "Setting up React Native DevTools..." -ForegroundColor Green

# Step 1: Setup port forwarding
Write-Host "`n1. Setting up port forwarding..." -ForegroundColor Yellow
adb reverse tcp:8097 tcp:8097
adb reverse tcp:8081 tcp:8081

Write-Host "   ✓ Port forwarding configured" -ForegroundColor Green

# Step 2: Start React DevTools (if not already running)
Write-Host "`n2. Starting React DevTools..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "react-devtools"

Write-Host "   ✓ React DevTools started" -ForegroundColor Green

# Step 3: Open dev menu on device
Write-Host "`n3. Opening dev menu on device..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
adb shell input keyevent 82

Write-Host "   ✓ Dev menu opened" -ForegroundColor Green

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNow on your device:" -ForegroundColor Cyan
Write-Host "  1. Tap 'Reload' to refresh the app" -ForegroundColor White
Write-Host "  2. React DevTools should connect automatically" -ForegroundColor White
Write-Host "`nIf DevTools is still blank:" -ForegroundColor Yellow
Write-Host "  - Make sure Metro bundler is running (npm start)" -ForegroundColor White
Write-Host "  - Reload the app one more time" -ForegroundColor White
