import React from 'react';
import Svg, {Path, Rect, Ellipse, G} from 'react-native-svg';

export default function WaterGlassIllustration({width = 70, height = 70}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 70 70" fill="none">
      <Path d="M22 14 L26 58 L44 58 L48 14 Z" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
      <Path d="M22 14 L26 36 L44 36 L48 14 Z" fill="#3B82F6" opacity="0.4" />
      <Ellipse cx="35" cy="14" rx="13" ry="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
      <Ellipse cx="35" cy="58" rx="9" ry="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />
      <Path d="M55 20 Q62 18 60 12" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Path d="M60 12 Q65 8 61 4" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Path d="M58 30 Q66 28 62 22" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M8 30 Q2 26 6 20" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M12 18 Q6 14 10 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}
