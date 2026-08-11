# Tabler Icons Quick Reference Guide

## Overview
SmartCare PHR now uses Tabler Icons - a professional, MIT-licensed icon library with 6000+ icons.

## Basic Usage

### Import Icons
```jsx
import { HomeIcon, HeartIcon, CalendarIcon } from '../../assets/icons/Icons';
```

### Use Icons in Components
```jsx
<HomeIcon size={24} color="#6C63FF" />
<HeartIcon size={32} color="#EF4444" />
<CalendarIcon size={20} color="#10B981" />
```

## Available Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | number | 24 | Icon width and height in pixels |
| `color` | string | "currentColor" | Icon stroke color (hex, rgb, or color name) |
| `stroke` | number | 2 | Stroke width in pixels |

## Example Use Cases

### Medical Icons
```jsx
import {
  StethoscopeIcon,
  HeartIcon,
  PillIcon,
  SyringeIcon,
  MicroscopeIcon,
  BrainIcon,
  LungsIcon,
  BoneIcon,
  ToothIcon,
} from '../../assets/icons/Icons';

// In component
<StethoscopeIcon size={24} color="#6C63FF" />
<PillIcon size={20} color="#10B981" />
<SyringeIcon size={22} color="#EF4444" />
```

### Specialty Icons
```jsx
import {
  BabyIcon,        // Pediatrics
  EarIcon,         // ENT
  ToothIcon,       // Dentistry
  BrainIcon,       // Neurology
  HeartIcon,       // Cardiology
  BoneIcon,        // Orthopedics
  SkinCareIcon,    // Dermatology
  LungsIcon,       // Pulmonology
} from '../../assets/icons/Icons';
```

### Navigation Icons
```jsx
import {
  HomeIcon,
  CalendarIcon,
  InvestigationNavIcon,
  ProfileIcon,
  SettingsGearIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowBackIcon,
} from '../../assets/icons/Icons';
```

### Action Icons
```jsx
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  DownloadIcon,
  SendIcon,
  RefreshIcon,
  CheckCircleIcon,
} from '../../assets/icons/Icons';
```

### UI/Utility Icons
```jsx
import {
  BellIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  InfoIcon,
  ChevronDownIcon,
  StarIcon,
  StarFilledIcon,
} from '../../assets/icons/Icons';
```

## Using Additional Tabler Icons

If you need an icon not in the pre-mapped list, import it directly from the Tabler package:

```jsx
import { IconActivity, IconAmbulance, IconVirus } from '@tabler/icons-react-native';

<IconActivity size={24} color="#6C63FF" />
<IconAmbulance size={28} color="#EF4444" />
<IconVirus size={20} color="#F59E0B" />
```

Browse all 6000+ icons at: **https://tabler.io/icons**

## Dynamic Icon Color

```jsx
// Using theme colors
import { colors } from '../../theme/colors';

<HeartIcon size={24} color={colors.primary} />
<BellIcon size={20} color={colors.error} />

// Conditional colors
<StarIcon 
  size={20} 
  color={isFavorite ? colors.warning : colors.textMuted} 
/>
```

## Icon in Buttons

```jsx
<TouchableOpacity 
  style={styles.button}
  onPress={handlePress}
>
  <PlusIcon size={20} color="#fff" />
  <Text style={styles.buttonText}>Add New</Text>
</TouchableOpacity>
```

## Icon with Background

```jsx
<View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
  <HeartIcon size={22} color={colors.primary} />
</View>

const styles = StyleSheet.create({
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

## Responsive Icon Sizes

```jsx
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const iconSize = screenWidth < 375 ? 20 : 24;

<HomeIcon size={iconSize} color={colors.primary} />
```

## Accessibility

Always add accessibility labels when using icons as interactive elements:

```jsx
<TouchableOpacity
  onPress={handleDelete}
  accessible={true}
  accessibilityLabel="Delete item"
  accessibilityRole="button"
>
  <TrashIcon size={20} color={colors.error} />
</TouchableOpacity>
```

## Icon Naming Convention

Tabler icons in the package use the `Icon[Name]` convention:
- `IconHome` → HomeIcon (our alias)
- `IconHeart` → HeartIcon (our alias)
- `IconCalendar` → CalendarIcon (our alias)

All our exported aliases match the old naming for backward compatibility.

## Custom Icons

Only the CheckboxIcon remains custom:

```jsx
import { CheckboxIcon } from '../../assets/icons/Icons';

<CheckboxIcon 
  size={24} 
  color="#6C63FF" 
  checked={isChecked}
  strokeWidth={2}
/>
```

## Best Practices

1. **Consistent Sizing** - Use standard sizes: 16, 20, 24, 28, 32
2. **Color from Theme** - Always use theme colors, not hardcoded values
3. **Accessibility** - Add labels for interactive icons
4. **Performance** - Icons are optimized, but avoid excessive re-renders
5. **Semantic Meaning** - Choose icons that clearly represent their function

## Common Patterns

### List Item with Icon
```jsx
<View style={styles.listItem}>
  <CalendarIcon size={20} color={colors.primary} />
  <Text style={styles.listText}>Appointment on {date}</Text>
</View>
```

### Card Header with Icon
```jsx
<View style={styles.cardHeader}>
  <StethoscopeIcon size={24} color={colors.primary} />
  <Text style={styles.cardTitle}>Health Records</Text>
</View>
```

### Empty State with Icon
```jsx
<View style={styles.emptyState}>
  <InboxIcon size={64} color={colors.textMuted} />
  <Text style={styles.emptyText}>No records found</Text>
</View>
```

## Troubleshooting

### Icon Not Showing
- Check import path is correct
- Verify icon name matches export from Icons.jsx
- Ensure size prop is provided (default is 24)

### Icon Color Not Changing
- Use `color` prop, not `fill` or `tint`
- Verify color value is valid (hex, rgb, or color name)

### Icons Look Too Thick/Thin
- Adjust `stroke` prop (default is 2)
- Try values between 1.5 and 2.5 for best results

## Support

For more icons or documentation:
- **Tabler Icons Website**: https://tabler.io/icons
- **GitHub Repository**: https://github.com/tabler/tabler-icons
- **Package Documentation**: https://www.npmjs.com/package/@tabler/icons-react-native
