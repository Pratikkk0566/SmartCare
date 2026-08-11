# Icon Migration to Tabler Icons

## Summary
All custom SVG icons have been replaced with professional Tabler Icons from the official `@tabler/icons-react-native` package.

## Benefits
- **6000+ professional icons** - MIT licensed, free for commercial use
- **Consistent design** - All icons follow the same 24x24 grid and 2px stroke design system
- **Better maintainability** - No custom SVG code to maintain
- **Industry standard** - Used by thousands of projects worldwide
- **Fully compatible** - Works seamlessly with React Native

## Package Installed
```bash
npm install @tabler/icons-react-native
```

## Icon Mapping
All icons have been mapped to their Tabler equivalents while maintaining backward compatibility:

| Old Custom Icon | New Tabler Icon | Component Name |
|----------------|-----------------|----------------|
| HomeIcon | IconHome | HomeIcon |
| InvoiceIcon | IconFileInvoice | InvoiceIcon |
| InvestigationsIcon | IconFlask | InvestigationsIcon |
| InvestigationNavIcon | IconClipboardCheck | InvestigationNavIcon |
| ProfileIcon | IconUserCircle | ProfileIcon |
| BellIcon | IconBell | BellIcon |
| SearchIcon | IconSearch | SearchIcon |
| FilterIcon | IconFilter | FilterIcon |
| CalendarIcon | IconCalendar | CalendarIcon |
| PillIcon | IconPill | PillIcon |
| CapsuleIcon | IconCapsule | CapsuleIcon |
| StethoscopeIcon | IconStethoscope | StethoscopeIcon |
| HeartIcon | IconHeart | HeartIcon |
| ToothIcon | IconDental | ToothIcon |
| BrainIcon | IconBrain | BrainIcon |
| LungsIcon | IconLungs | LungsIcon |
| BoneIcon | IconBone | BoneIcon |
| SkinCareIcon | IconMoodSmile | SkinCareIcon |
| BabyIcon | IconBabyCarriage | BabyIcon |
| EarIcon | IconEar | EarIcon |
| HospitalIcon | IconBuildingHospital | HospitalIcon |
| MicroscopeIcon | IconMicroscope | MicroscopeIcon |
| HeartRateIcon | IconHeartRateMonitor | HeartRateIcon |
| SyringeIcon | IconSyringe | SyringeIcon |
| BloodDropIcon | IconDropletHalf | BloodDropIcon |
| MedicinesIcon | IconMedicineSyrup | MedicinesIcon |
| ... and 50+ more | ... | ... |

## Usage
Icons work exactly the same as before:

```jsx
import { HomeIcon, HeartIcon, BellIcon } from '../../assets/icons/Icons';

// Use with size and color props
<HomeIcon size={24} color="#6C63FF" />
<HeartIcon size={32} color="#EF4444" />
<BellIcon size={20} color="#10B981" />
```

## Custom Icons Retained
Only one custom icon was retained (not available in Tabler):

- **CheckboxIcon** - Custom checkbox with checked/unchecked states

## Tabler Icon Props
All Tabler icons accept these props:

- `size` - Number (default: 24)
- `color` - String (default: "currentColor")
- `stroke` - Number (default: 2) - stroke width

## Additional Icons Available
You can import any of the 6000+ Tabler icons directly:

```jsx
import { IconActivity, IconAlarm, IconAmbulance } from '@tabler/icons-react-native';
```

Browse all available icons at: https://tabler.io/icons

## Migration Status
✅ **COMPLETE** - All 77 custom icons replaced
✅ **TESTED** - All screens compile without errors
✅ **BACKWARD COMPATIBLE** - No changes required in existing code

## Files Modified
- `src/assets/icons/Icons.jsx` - Replaced with Tabler imports
- `package.json` - Added @tabler/icons-react-native dependency

## No Breaking Changes
All existing icon usages throughout the app continue to work without any code changes required.
