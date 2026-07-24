import React from 'react';
import Svg, {Path, Circle, Rect, Line, Polyline, Polygon, G, Ellipse} from 'react-native-svg';

const icon = (paths, vb = '0 0 24 24') =>
  React.memo(({size = 24, color = '#6C63FF', strokeWidth = 2}) => (
    <Svg width={size} height={size} viewBox={vb} fill="none">
      {paths(color, strokeWidth)}
    </Svg>
  ));

export const HomeIcon = icon((c, sw) => (
  <>
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="9,22 9,12 15,12 15,22" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const InvoiceIcon = icon((c, sw) => (
  <>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14,2 14,8 20,8" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="16" y1="13" x2="8" y2="13" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="16" y1="17" x2="8" y2="17" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Polyline points="10,9 9,9 8,9" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const InvestigationsIcon = icon((c, sw) => (
  <>
    <Path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0h10m-10 0 4 7m6-7-4 7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const ProfileIcon = icon((c, sw) => (
  <>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const PlusIcon = icon((c, sw) => (
  <>
    <Line x1="12" y1="5" x2="12" y2="19" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const BellIcon = icon((c, sw) => (
  <>
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const SearchIcon = icon((c, sw) => (
  <>
    <Circle cx="11" cy="11" r="8" stroke={c} strokeWidth={sw} />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const FilterIcon = icon((c, sw) => (
  <>
    <Polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const ArrowRightIcon = icon((c, sw) => (
  <>
    <Line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Polyline points="12,5 19,12 12,19" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const ArrowLeftIcon = icon((c, sw) => (
  <>
    <Line x1="19" y1="12" x2="5" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Polyline points="12,19 5,12 12,5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const ArrowBackIcon = icon((c, sw) => (
  <>
    <Polyline points="15,18 9,12 15,6" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const CalendarIcon = icon((c, sw) => (
  <>
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="16" y1="2" x2="16" y2="6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="8" y1="2" x2="8" y2="6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const PillIcon = icon((c, sw) => (
  <>
    <Path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6.5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 14a3 3 0 1 1 6 0c0 2.5-3 5-3 5s-3-2.5-3-5z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="20" cy="14" r="1" fill={c} />
  </>
));

export const CapsuleIcon = icon((c, sw) => (
  <>
    <Path d="M5.5 8.5 10 4a5 5 0 0 1 7 7l-4.5 4.5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 15.5 14 20a5 5 0 0 1-7-7l4.5-4.5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="8" y1="16" x2="16" y2="8" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const FlaskIcon = icon((c, sw) => (
  <>
    <Path d="M9 3h6m-6 0v8L4.9 18.1A2 2 0 0 0 6.76 21h10.48a2 2 0 0 0 1.86-2.9L15 11V3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="9" y1="3" x2="15" y2="3" stroke={c} strokeWidth={sw} />
  </>
));

export const StethoscopeIcon = icon((c, sw) => (
  <>
    <Path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="20" cy="10" r="2" stroke={c} strokeWidth={sw} />
  </>
));

export const HeartIcon = icon((c, sw) => (
  <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const ToothIcon = icon((c, sw) => (
  <Path d="M12 5.5c-1.5-2-3.5-3-5-2.5C4 4 3 7 4 10c.5 2 1 3.5 2 5 .5 1.5 1 3 2 4 .5 1 1 1 1.5 0 .5-1.5 1-3.5 2.5-3.5s2 2 2.5 3.5c.5 1 1 1 1.5 0 1-1 1.5-2.5 2-4 1-1.5 1.5-3 2-5 1-3 0-6-3-7-1.5-.5-3.5.5-5 2.5z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const BrainIcon = icon((c, sw) => (
  <>
    <Path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const LungsIcon = icon((c, sw) => (
  <>
    <Path d="M12 3v9" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Path d="M6.6 15.6c-1.5 1-3 1.3-4 .7-1-.6-1.3-2-.7-3.5L5 8.5C5.7 7 7 6 8 6.3c1 .3 1.5 1.5 1 3l-1 4c-.4 1.5 0 2.5.7 3.3.7.8 2 1.2 3 .7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17.4 15.6c1.5 1 3 1.3 4 .7 1-.6 1.3-2 .7-3.5L19 8.5c-.7-1.5-2-2.5-3-2.2-1 .3-1.5 1.5-1 3l1 4c.4 1.5 0 2.5-.7 3.3-.7.8-2 1.2-3 .7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const BoneIcon = icon((c, sw) => (
  <>
    <Path d="M17 10c.7-.7 1.69-.7 2.5 0a1.77 1.77 0 0 1 0 2.5c-.81.7-1.8.7-2.5 0L7 2.5C6.3 1.8 6.3.8 7 0a1.77 1.77 0 0 1 2.5 0c.7.7.7 1.69 0 2.5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 14c-.7.7-1.69.7-2.5 0a1.77 1.77 0 0 1 0-2.5c.81-.7 1.8-.7 2.5 0L17 21.5c.7.7.7 1.7 0 2.5a1.77 1.77 0 0 1-2.5 0c-.7-.7-.7-1.69 0-2.5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const SkinIcon = icon((c, sw) => (
  <>
    <Path d="M20 7c0 5-4 5-4 10a4 4 0 1 1-8 0c0-5-4-5-4-10a8 8 0 0 1 16 0Z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 22v-3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Path d="M10 15h4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const GridIcon = icon((c, sw) => (
  <>
    <Rect x="3" y="3" width="7" height="7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="14" y="3" width="7" height="7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="14" y="14" width="7" height="7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="3" y="14" width="7" height="7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const SunriseIcon = icon((c, sw) => (
  <>
    <Path d="M17 18a5 5 0 0 0-10 0" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="2" x2="12" y2="9" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="4.22" y1="10.22" x2="5.64" y2="11.64" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="1" y1="18" x2="3" y2="18" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="21" y1="18" x2="23" y2="18" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="18.36" y1="11.64" x2="19.78" y2="10.22" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="23" y1="22" x2="1" y2="22" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Polyline points="8,6 12,2 16,6" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const SunIcon = icon((c, sw) => (
  <>
    <Circle cx="12" cy="12" r="5" stroke={c} strokeWidth={sw} />
    <Line x1="12" y1="1" x2="12" y2="3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="12" y1="21" x2="12" y2="23" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="1" y1="12" x2="3" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="21" y1="12" x2="23" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const MoonIcon = icon((c, sw) => (
  <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const ClockIcon = icon((c, sw) => (
  <>
    <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth={sw} />
    <Polyline points="12,6 12,12 16,14" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const CheckCircleIcon = icon((c, sw) => (
  <>
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22,4 12,14.01 9,11.01" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const ShieldIcon = icon((c, sw) => (
  <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const DocumentIcon = icon((c, sw) => (
  <>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14,2 14,8 20,8" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="16" y1="13" x2="8" y2="13" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="16" y1="17" x2="8" y2="17" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const DownloadIcon = icon((c, sw) => (
  <>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="7,10 12,15 17,10" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="15" x2="12" y2="3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const CameraIcon = icon((c, sw) => (
  <>
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" stroke={c} strokeWidth={sw} />
  </>
));

export const SettingsGearIcon = icon((c, sw) => (
  <>
    <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={sw} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const PersonIcon = icon((c, sw) => (
  <>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={c} strokeWidth={sw} />
  </>
));

export const MedicalCrossIcon = icon((c, sw) => (
  <>
    <Rect x="2" y="8" width="20" height="8" rx="2" stroke={c} strokeWidth={sw} />
    <Rect x="8" y="2" width="8" height="20" rx="2" stroke={c} strokeWidth={sw} />
  </>
));

export const ClipboardIcon = icon((c, sw) => (
  <>
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="9" y1="12" x2="15" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="9" y1="16" x2="13" y2="16" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const InfoIcon = icon((c, sw) => (
  <>
    <Circle cx="12" cy="12" r="10" stroke={c} strokeWidth={sw} />
    <Line x1="12" y1="8" x2="12" y2="12" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="12" y1="16" x2="12.01" y2="16" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const LockIcon = icon((c, sw) => (
  <>
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const BookmarkIcon = icon((c, sw) => (
  <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const StarIcon = icon((c, sw) => (
  <Polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const HomeDeliveryIcon = icon((c, sw) => (
  <>
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="9,22 9,12 15,12 15,22" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const PharmacyIcon = icon((c, sw) => (
  <>
    <Path d="M3 3h18v4H3z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 7v14h14V7" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="11" x2="12" y2="17" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    <Line x1="9" y1="14" x2="15" y2="14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const BloodDropIcon = icon((c, sw) => (
  <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const GlucoseIcon = icon((c, sw) => (
  <>
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth={sw} />
    <Path d="M9 9h6M9 12h6M9 15h4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const BeakerIcon = icon((c, sw) => (
  <>
    <Path d="M4.5 3h15M6 3v8.5L2 19h20l-4-7.5V3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const PinIcon = icon((c, sw) => (
  <>
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="10" r="3" stroke={c} strokeWidth={sw} />
  </>
));

export const PhoneIcon = icon((c, sw) => (
  <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const MailIcon = icon((c, sw) => (
  <>
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22,6 12,13 2,6" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  </>
));

export const EyeIcon = icon((c, sw) => (
  <>
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={sw} />
  </>
));

export const EyeOffIcon = icon((c, sw) => (
  <>
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="1" y1="1" x2="23" y2="23" stroke={c} strokeWidth={sw} strokeLinecap="round" />
  </>
));

export const ChevronDownIcon = icon((c, sw) => (
  <Polyline points="6,9 12,15 18,9" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
));

export const CheckboxIcon = ({size = 24, color = '#6C63FF', checked = false}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {checked ? (
      <>
        <Rect x="2" y="2" width="20" height="20" rx="4" fill={color} />
        <Polyline points="7,12 10,15 17,8" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <Rect x="2" y="2" width="20" height="20" rx="4" stroke="#9CA3AF" strokeWidth={2} />
    )}
  </Svg>
);
