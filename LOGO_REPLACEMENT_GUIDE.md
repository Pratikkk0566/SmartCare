# Logo Replacement Guide - SmartCare PHR

## Summary

Your new logo files have been added to `src/assets/images/`. The app will automatically use them since the code already references these file paths.

---

## 📍 Where Logos Are Used

### 1. **In-App Screens** (PNG Logo)
The following screens display your logo using `ic_launcher_foreground.png`:

| Screen | File | Usage |
|--------|------|-------|
| Welcome Screen | `WelcomeScreen.jsx` | Large centered logo with app name |
| Phone Login | `PhoneLoginScreen.jsx` | Logo in header with tagline |
| Phone Entry | `PhoneNumberEntry.jsx` | Small logo in header |
| Language Select | `LanguageSelectScreen.jsx` | Logo in header |

**Current import:**
```jsx
const appLogo = require('../../assets/images/ic_launcher_foreground.png');
```

**Rendered as:**
```jsx
<Image source={appLogo} style={styles.logoImg} />
```

### 2. **Splash Screen** (SVG Logo)
The splash screen uses a custom SVG logo component (`AppLogo`) defined directly in `SplashScreen.jsx`.

**Current:** Heart with medical cross SVG
**Location:** `src/screens/Onboarding/SplashScreen.jsx` (lines 12-41)

### 3. **Android App Icon** (Multiple Densities)
Android launcher icons in multiple sizes:

**Locations:**
- `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- `android/res/mipmap-*/ic_launcher*.png`

**Sizes:**
- **mdpi**: 48x48px
- **hdpi**: 72x72px  
- **xhdpi**: 96x96px
- **xxhdpi**: 144x144px
- **xxxhdpi**: 192x192px

### 4. **iOS App Icon** (To Be Added)
**Location:** `ios/Sus/Images.xcassets/AppIcon.appiconset/`

**Sizes needed:**
- 1024x1024 (App Store)
- 180x180 (iPhone 3x)
- 120x120 (iPhone 2x)
- 87x87 (iPhone 3x Settings)
- 80x80 (iPhone 2x Settings)
- 60x60 (iPhone 1x Settings)
- 58x58 (iPhone 2x Notification)
- 40x40 (iPhone 1x Notification)

---

## ✅ What's Already Done

### 1. In-App Logo Files
✅ New files added to `src/assets/images/`:
- `ic_launcher.png` (17,975 bytes) - dated 22-07-2026
- `ic_launcher_foreground.png` (36,002 bytes) - dated 22-07-2026

These will be automatically used by all screens that reference them.

### 2. Code References
✅ All 4 screens already import and use the correct file path
✅ No code changes needed - logos will update automatically

---

## 🔄 What You May Want to Update

### Option 1: Keep Current Setup (Recommended)
If your new PNG files in `src/assets/images/` are the correct logos, you're done! Just:

1. **Clear Metro cache**:
   ```bash
   npm start -- --reset-cache
   ```

2. **Rebuild the app**:
   ```bash
   # Android
   npm run android
   
   # iOS (when ready)
   npm run ios
   ```

The new logos will appear automatically.

---

### Option 2: Update Splash Screen SVG Logo

If you want the splash screen to use your new logo design instead of the custom SVG:

#### A. Replace SVG with PNG Image

**Current** (Custom SVG):
```jsx
function AppLogo() {
  return (
    <Svg width={110} height={110} viewBox="0 0 200 200" fill="none">
      {/* Heart with medical cross */}
    </Svg>
  );
}
```

**Replace with** (Your PNG logo):
```jsx
// Add at top of file
import { Image } from 'react-native';
const appLogo = require('../../assets/images/ic_launcher_foreground.png');

// Replace AppLogo component
function AppLogo() {
  return (
    <Image 
      source={appLogo} 
      style={{ width: 110, height: 110 }}
      resizeMode="contain"
    />
  );
}
```

#### B. Or Keep SVG and Update Design

Update the SVG paths inside the `AppLogo` component to match your new logo design.

---

### Option 3: Update Android Launcher Icons

Replace all Android app icons with your new logo in all density folders:

**Required steps:**

1. Generate all required sizes from your master logo
2. Replace files in these folders:
   - `android/app/src/main/res/mipmap-mdpi/`
   - `android/app/src/main/res/mipmap-hdpi/`
   - `android/app/src/main/res/mipmap-xhdpi/`
   - `android/app/src/main/res/mipmap-xxhdpi/`
   - `android/app/src/main/res/mipmap-xxxhdpi/`

**Files to replace in each folder:**
- `ic_launcher.png` (round icon)
- `ic_launcher_foreground.png` (foreground layer)
- `ic_launcher_background.png` (background layer)
- `ic_launcher_monochrome.png` (monochrome version for themed icons)

**Tool recommendation:**
- Use Android Studio's Image Asset Studio
- Or online tool: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html

---

### Option 4: Add iOS App Icons

Create iOS app icon set:

1. **Generate required sizes** (from 1024x1024 master)
   - Use https://appicon.co or Xcode

2. **Add to project:**
   - Create `ios/Sus/Images.xcassets/AppIcon.appiconset/` folder
   - Add all PNG files
   - Create `Contents.json` manifest

3. **Or use Xcode:**
   ```bash
   open ios/Sus.xcworkspace
   # Navigate to Images.xcassets > AppIcon
   # Drag and drop your 1024x1024 logo
   ```

---

## 📏 Logo Size Guidelines

### In-App Logo (`ic_launcher_foreground.png`)
- **Current size:** 36,002 bytes (likely 512x512 or 1024x1024)
- **Recommended:** 512x512px PNG with transparency
- **Format:** PNG-24 with alpha channel
- **Used on:** Welcome, Login, and other screens

### Splash Screen Logo
- **Current:** SVG (resolution-independent)
- **If using PNG:** 256x256 to 512x512px
- **Background:** Transparent (app has purple background)

### Android Launcher Icon
- **Master:** 512x512px PNG
- **Foreground:** Logo with padding (should fit in 60% safe zone)
- **Background:** Solid color or simple pattern
- **Monochrome:** Single-color version for themed icons

### iOS App Icon
- **Master:** 1024x1024px PNG
- **No transparency:** iOS doesn't support transparent app icons
- **No alpha channel:** Use solid background color
- **Square:** iOS automatically rounds corners

---

## 🎨 Logo Display Specifications

### Welcome Screen
```
Size: ~140x140 display pixels
Position: Center top
Background: Purple gradient
Text below: "SmartCare PHR" (large) + tagline
```

### Login Screens (Phone/Language)
```
Size: ~80x80 display pixels
Position: Top center
Background: White
Text: "SmartCare PHR" next to or below logo
```

### Splash Screen
```
Size: ~150x150 display pixels (inside circle)
Position: Center
Background: Purple (#6C63FF)
Animation: Scale from 0 to 1 with spring
Extra: Pulsing ring behind logo
```

### App Icon (Home Screen)
```
Size: Variable by device
Shape: Rounded square (Android) / Rounded (iOS)
Background: Should look good at small sizes
Requirement: Must be recognizable at 40x40px
```

---

## 🔧 Quick Commands

### View Current Logo in Screens
```bash
# Start app in development mode
npm start
npm run android  # or npm run ios
```

### Clear Cache (if logo doesn't update)
```bash
# Clear Metro bundler cache
npm start -- --reset-cache

# Clean Android build
cd android && ./gradlew clean && cd ..

# Clean iOS build (Mac only)
cd ios && xcodebuild clean && cd ..
```

### Rebuild Android
```bash
npm run android

# Or force clean rebuild
cd android
./gradlew clean
cd ..
npm run android
```

---

## ✅ Verification Checklist

After replacing logos:

- [ ] Welcome screen shows new logo
- [ ] Phone login screen shows new logo  
- [ ] Language select screen shows new logo
- [ ] Phone entry screen shows new logo
- [ ] Splash screen logo looks correct
- [ ] Android app icon updated (home screen)
- [ ] iOS app icon added (when iOS build ready)
- [ ] Logo looks sharp on all screen sizes
- [ ] Logo has proper spacing/padding
- [ ] Background colors work with logo
- [ ] Animations work smoothly

---

## 📱 Screen-by-Screen Logo Sizes

| Screen | Logo Width | Logo Height | Notes |
|--------|------------|-------------|-------|
| Splash | 150px (inside 150px circle) | 150px | Purple bg, pulsing ring |
| Welcome | 140px | 140px | Large, centered |
| Phone Login | 70px | 70px | Header with tagline |
| Phone Entry | 50px | 50px | Compact header |
| Language Select | 80px | 80px | Top center |

*All sizes are display pixels (actual pixels may be 2x-3x on high-DPI screens)*

---

## 🎯 Recommendations

### For Best Results:

1. **Master Logo File**: Create a 1024x1024px PNG with transparency
2. **Safe Zone**: Keep important elements within 60% center (for Android adaptive icons)
3. **Colors**: Ensure logo works on both light and dark backgrounds
4. **Simplicity**: Logo should be recognizable even at 40x40px
5. **File Size**: Keep under 100KB for fast loading

### Current Status:

✅ In-app logo files updated (`src/assets/images/`)  
⏳ Splash screen still uses custom SVG  
⏳ Android launcher icons need updating  
⏳ iOS app icons need to be created

---

## 🚀 Next Steps

**If your new logos in `src/assets/images/` are correct:**

1. Clear Metro cache: `npm start -- --reset-cache`
2. Rebuild: `npm run android`
3. Test on device/emulator
4. ✅ Done!

**If you want to update everything:**

1. Update splash screen SVG (see Option 2 above)
2. Generate Android launcher icons (all densities)
3. Generate iOS app icons (when iOS build is ready)
4. Test on multiple devices/screen sizes

---

Need help? Check which logo appears where by running the app and navigating through:
1. Splash screen (on app launch)
2. Language selection screen
3. Welcome/login screens
4. Home screen app icon

**Questions?** All logo files are located in:
- In-app: `src/assets/images/`
- Android: `android/app/src/main/res/mipmap-*/`
- iOS: `ios/Sus/Images.xcassets/` (to be created)
