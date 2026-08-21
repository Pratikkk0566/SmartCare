// Tabler Icons imports for SmartCare PHR
// Using @tabler/icons-react-native package
// All icons are MIT licensed and professionally designed

import {
  IconHome,
  IconFile,
  IconFileInvoice,
  IconFlask,
  IconClipboardCheck,
  IconUser,
  IconUserCircle,
  IconPlus,
  IconBell,
  IconSearch,
  IconFilter,
  IconArrowRight,
  IconArrowLeft,
  IconChevronLeft,
  IconCalendar,
  IconPill,
  IconCapsule,
  IconStethoscope,
  IconHeart,
  IconDental,
  IconBrain,
  IconLungs,
  IconBone,
  IconMoodSmile,
  IconDroplet,
  IconSun,
  IconMoon,
  IconClock,
  IconCircleCheck,
  IconShield,
  IconDownload,
  IconCamera,
  IconSettings,
  IconMedicalCross,
  IconClipboard,
  IconInfoCircle,
  IconLock,
  IconBookmark,
  IconStar,
  IconStarFilled,
  IconTruck,
  IconBuildingHospital,
  IconWallet,
  IconDropletHalf,
  IconHeartRateMonitor,
  // IconSyringe might not exist, using IconVaccine as fallback
  IconVaccine,
  IconPhone,
  IconMail,
  IconEye,
  IconEyeOff,
  IconChevronDown,
  IconSquare,
  IconSquareCheck,
  IconBabyCarriage,
  IconEar,
  IconMicroscope,
  IconSend,
  IconWifiOff,
  IconRefresh,
  IconEdit,
  IconScale,
  IconRuler,
  IconVideo,
  IconArrowsSort,
  IconGridDots,
  IconSunrise,
  IconPackage,
  IconMedicineSyrup,
  IconFileText,
  IconTrash,
  IconCheck,
  IconBottle,
  IconEyeglass,
  IconDeviceTablet,
  IconSpray,
  // IconVaccine already imported above
  IconBandage,
  IconToolsKitchen2,
  IconCoffee,
  IconApple,
  IconBowl,
  IconNumber,
  IconHash,
  IconBoxMultiple,
  IconClock24,
  IconClockHour8,
  IconClockHour2,
  IconClockHour4,
  IconRepeat,
  IconAlertCircle,
  IconX,
  IconChevronRight,
  IconEgg,
} from '@tabler/icons-react-native';

// Re-export with app-specific names for backwards compatibility
// This allows the rest of the app to use the same icon names as before

export const HomeIcon = IconHome;
export const InvoiceIcon = IconFileInvoice;
export const InvestigationsIcon = IconFlask;
export const InvestigationNavIcon = IconClipboardCheck;
export const ProfileIcon = IconUserCircle;
export const PlusIcon = IconPlus;
export const BellIcon = IconBell;
export const SearchIcon = IconSearch;
export const FilterIcon = IconFilter;
export const ArrowRightIcon = IconArrowRight;
export const ArrowLeftIcon = IconArrowLeft;
export const ArrowBackIcon = IconChevronLeft;
export const CalendarIcon = IconCalendar;
export const PillIcon = IconPill;
export const CapsuleIcon = IconCapsule;
export const FlaskIcon = IconFlask;
export const StethoscopeIcon = IconStethoscope;
export const HeartIcon = IconHeart;
export const ToothIcon = IconDental;
export const BrainIcon = IconBrain;
export const LungsIcon = IconLungs;
export const BoneIcon = IconBone;
export const SkinCareIcon = IconMoodSmile; // Face icon for dermatology
export const JointIcon = IconBone; // Alternative bone icon
export const SkinIcon = IconDroplet; // Skin/dermatology alternative
export const GridIcon = IconGridDots;
export const SunriseIcon = IconSunrise;
export const SunIcon = IconSun;
export const MoonIcon = IconMoon;
export const ClockIcon = IconClock;
export const CheckCircleIcon = IconCircleCheck;
export const ShieldIcon = IconShield;
export const DocumentIcon = IconFile;
export const DownloadIcon = IconDownload;
export const CameraIcon = IconCamera;
export const SettingsGearIcon = IconSettings;
export const PersonIcon = IconUser;
export const MedicalCrossIcon = IconMedicalCross;
export const ClipboardIcon = IconClipboard;
export const InfoIcon = IconInfoCircle;
export const LockIcon = IconLock;
export const BookmarkIcon = IconBookmark;
export const StarIcon = IconStar;
export const HomeDeliveryIcon = IconTruck;
export const PharmacyIcon = IconBuildingHospital;
export const MedicinesIcon = IconMedicineSyrup;
export const WalletIcon = IconWallet;
export const BloodDropIcon = IconEgg;
export const GlucoseIcon = IconDroplet;
export const BeakerIcon = IconFlask;
export const PinIcon = IconBuildingHospital; // Using hospital icon as location fallback
export const MapPinIcon = IconBuildingHospital; // Alias for consistency
export const PhoneIcon = IconPhone;
export const MailIcon = IconMail;
export const EyeIcon = IconEye;
export const EyeOffIcon = IconEyeOff;
export const ChevronDownIcon = IconChevronDown;
export const BabyIcon = IconBabyCarriage;
export const EarIcon = IconEar;
export const HospitalIcon = IconBuildingHospital;
export const HospitalBuildingIcon = IconBuildingHospital; // Alias for consistency
export const MicroscopeIcon = IconMicroscope;
export const SendIcon = IconSend;
export const WifiOffIcon = IconWifiOff;
export const RefreshIcon = IconRefresh;
export const EditIcon = IconEdit;
export const ScaleIcon = IconScale;
export const RulerIcon = IconRuler;
export const StarFilledIcon = IconStarFilled;
export const HeartRateIcon = IconHeartRateMonitor;
export const SyringeIcon = IconVaccine; // Using IconVaccine as fallback since IconSyringe may not exist
export const InjectionIcon = IconVaccine; // Alternative name for injection
export const VideoIcon = IconVideo;
export const SortIcon = IconArrowsSort;
export const FileTextIcon = IconFileText;
export const TrashIcon = IconTrash;
export const CheckIcon = IconCheck;
export const UserIcon = IconUser;
export const BottleIcon = IconBottle;
export const EyeglassIcon = IconEyeglass;
export const TabletIcon = IconDeviceTablet;
export const SprayIcon = IconSpray;
export const VaccineIcon = IconVaccine;
export const BandageIcon = IconBandage;
export const ToolsKitchen2Icon = IconToolsKitchen2;
export const CoffeeIcon = IconCoffee;
export const AppleIcon = IconApple;
export const BowlIcon = IconBowl;
export const NumberIcon = IconNumber;
export const HashIcon = IconHash;
export const BoxMultipleIcon = IconBoxMultiple;
export const Clock24Icon = IconClock24;
export const ClockHour8Icon = IconClockHour8;
export const ClockHour2Icon = IconClockHour2;
export const ClockHour4Icon = IconClockHour4;
export const RepeatIcon = IconRepeat;
export const AlertCircleIcon = IconAlertCircle;
export const XIcon = IconX;
export const ChevronLeftIcon = IconChevronLeft;
export const ChevronRightIcon = IconChevronRight;

// Custom CheckboxIcon component (Tabler doesn't have a pre-filled checkbox variant)
import React from 'react';
import Svg, {Rect, Polyline} from 'react-native-svg';

export const CheckboxIcon = ({size = 24, color = '#6C63FF', checked = false, strokeWidth = 2}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {checked ? (
      <>
        <Rect x="4" y="4" width="16" height="16" rx="2" fill={color} />
        <Polyline points="7,12 10,15 17,8" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth={strokeWidth} />
    )}
  </Svg>
);

// Note: To use additional Tabler icons not listed above, import them directly:
// import { IconActivity, IconAmbulance } from '@tabler/icons-react-native';
// This approach avoids bundling all 6000+ icons and keeps the app size small.
