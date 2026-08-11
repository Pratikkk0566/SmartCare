# Update Android App Icon - SmartCare PHR

Your new app icon is ready: `src/assets/images/ic_launcher.png`

To update the Android launcher icon (the icon on the home screen), follow these steps:

---

## Option 1: Using Android Studio (Recommended - Easiest)

### Steps:

1. **Open Android Studio**
   ```bash
   # From project root
   open -a "Android Studio" android/
   # Or on Windows: start android/
   ```

2. **Open Image Asset Studio**
   - Right-click on `app` folder in Project view
   - Select `New` → `Image Asset`

3. **Configure Icon**
   - **Icon Type:** Launcher Icons (Adaptive and Legacy)
   - **Name:** `ic_launcher`
   - **Foreground Layer:**
     - **Source Asset:** Select `src/assets/images/ic_launcher_foreground.png`
     - **Trim:** Yes
     - **Resize:** 80% (adjust to fit in safe zone)
   - **Background Layer:**
     - **Color:** `#6C63FF` (your app's primary purple)
     - Or use a solid color image

4. **Generate**
   - Click `Next`
   - Click `Finish`
   - Android Studio will generate all required sizes automatically!

5. **Rebuild App**
   ```bash
   npm run android
   ```

---

## Option 2: Using Online Tool (Quick)

### Steps:

1. **Go to:** https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html

2. **Upload your icon:**
   - Upload `src/assets/images/ic_launcher.png`
   - Or `ic_launcher_foreground.png` (better quality)

3. **Configure:**
   - **Padding:** 10-20% (so icon doesn't touch edges)
   - **Background Color:** #6C63FF (purple)
   - **Shape:** Circle or Square (your choice)

4. **Download**
   - Click `Download`
   - You'll get a ZIP with all density folders

5. **Extract and Copy**
   ```bash
   # Extract the ZIP
   # Copy all folders to:
   android/app/src/main/res/
   
   # It will have:
   # - mipmap-mdpi/
   # - mipmap-hdpi/
   # - mipmap-xhdpi/
   # - mipmap-xxhdpi/
   # - mipmap-xxxhdpi/
   ```

6. **Rebuild**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

---

## Option 3: Manual Copy (Quick but Not Optimal)

If you just want to test quickly:

### PowerShell Script (Windows):

```powershell
# Copy the icon to all density folders
$source = "src\assets\images\ic_launcher.png"
$densities = @("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")

foreach ($density in $densities) {
    $dest = "android\app\src\main\res\mipmap-$density\ic_launcher.png"
    Copy-Item $source $dest -Force
    Write-Host "Copied to mipmap-$density"
}

# Do the same for foreground
$source = "src\assets\images\ic_launcher_foreground.png"
foreach ($density in $densities) {
    $dest = "android\app\src\main\res\mipmap-$density\ic_launcher_foreground.png"
    Copy-Item $source $dest -Force
    Write-Host "Copied foreground to mipmap-$density"
}

Write-Host "Done! Now run: npm run android"
```

**Note:** This will use the same image for all densities, which isn't ideal but works for testing.

---

## Option 4: Using React Native Asset (Automated)

### Install Tool:
```bash
npm install -g react-native-asset
```

### Create config file: `app.json`
```json
{
  "name": "SmartCare PHR",
  "displayName": "SmartCare PHR",
  "assets": [
    "./src/assets/images"
  ]
}
```

### Run:
```bash
react-native-asset
```

This will automatically copy assets to iOS and Android.

---

## What Each File Does

| File | Purpose |
|------|---------|
| `ic_launcher.png` | Legacy app icon (Android < 8.0) |
| `ic_launcher_foreground.png` | Foreground layer for adaptive icon |
| `ic_launcher_background.png` | Background layer for adaptive icon |
| `ic_launcher_monochrome.png` | Monochrome version for themed icons |

### Adaptive Icons (Android 8.0+)
- Uses `foreground` + `background` layers
- System can mask/animate them
- Looks better with different launcher themes

### Legacy Icons (Android < 8.0)
- Uses single `ic_launcher.png`
- Simple, no layers

---

## Required Sizes

| Density | Size | Folder |
|---------|------|--------|
| mdpi | 48x48 | mipmap-mdpi |
| hdpi | 72x72 | mipmap-hdpi |
| xhdpi | 96x96 | mipmap-xhdpi |
| xxhdpi | 144x144 | mipmap-xxhdpi |
| xxxhdpi | 192x192 | mipmap-xxxhdpi |

**Master:** 512x512 or 1024x1024 PNG

---

## Verification

After updating, verify the new icon:

1. **Uninstall old app**
   ```bash
   adb uninstall com.sus
   ```

2. **Reinstall with new icon**
   ```bash
   npm run android
   ```

3. **Check home screen**
   - Look for "SmartCare PHR" app icon
   - Should show your new logo

4. **Test adaptive icon**
   - Long press app icon
   - Should show your foreground logo

---

## Troubleshooting

### Icon Doesn't Update

**Cause:** Android caches launcher icons

**Solutions:**
1. Uninstall app completely: `adb uninstall com.sus`
2. Clear launcher cache: Settings → Apps → Launcher → Clear Data
3. Restart device
4. Reinstall: `npm run android`

### Icon Looks Pixelated

**Cause:** Wrong size or low-resolution source

**Solution:**
- Use high-resolution source (512x512 minimum)
- Generate proper sizes for each density
- Use PNG format, not JPG

### Background Color Wrong

**Edit:** `android/app/src/main/res/values/colors.xml`
```xml
<resources>
    <color name="ic_launcher_background">#6C63FF</color>
</resources>
```

---

## Quick Reference Commands

```bash
# Clean Android build
cd android && ./gradlew clean && cd ..

# Uninstall app
adb uninstall com.sus

# Fresh install
npm run android

# Check installed icon
adb shell pm list packages -f | grep sus
```

---

## Recommended Approach

**For best results, use Option 1 (Android Studio):**

1. It generates all required sizes automatically
2. Creates adaptive icons properly
3. Handles safe zones correctly
4. Preview before generating

**Time:** 5 minutes  
**Quality:** Professional ✅

---

## Need Help?

Your current files:
- ✅ `ic_launcher.png` (17,975 bytes)
- ✅ `ic_launcher_foreground.png` (36,002 bytes)

Located in: `src/assets/images/`

**Next step:** Choose an option above and follow the steps!
