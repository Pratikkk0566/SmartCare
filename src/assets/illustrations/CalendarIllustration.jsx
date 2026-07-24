import React from 'react';
import Svg, {Rect, Circle, Path, Line, G} from 'react-native-svg';

export default function CalendarIllustration({width = 80, height = 80}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 80 80" fill="none">
      <Rect x="8" y="14" width="52" height="48" rx="6" fill="#EEE9FF" />
      <Rect x="8" y="14" width="52" height="48" rx="6" stroke="#6C63FF" strokeWidth="2" />
      <Rect x="8" y="14" width="52" height="14" rx="6" fill="#6C63FF" />
      <Rect x="8" y="21" width="52" height="7" fill="#6C63FF" />
      <Line x1="24" y1="8" x2="24" y2="20" stroke="#6C63FF" strokeWidth="3" strokeLinecap="round" />
      <Line x1="44" y1="8" x2="44" y2="20" stroke="#6C63FF" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="22" cy="38" r="4" fill="#6C63FF" />
      <Path d="M20 38 L21.5 39.5 L25 36" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="30" y="35" width="20" height="3" rx="1.5" fill="#C4B5FD" />
      <Rect x="14" y="47" width="12" height="3" rx="1.5" fill="#C4B5FD" />
      <Rect x="30" y="47" width="8" height="3" rx="1.5" fill="#C4B5FD" />
      <Circle cx="64" cy="52" r="10" fill="#22C55E" opacity="0.2" />
      <Path d="M60 52 L63 55 L68 49" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="68" cy="18" r="6" fill="#FEF3C7" />
      <Path d="M65 18 L67 20 L71 15" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M72 62 Q76 58 74 54" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M74 54 Q79 53 76 49" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}
