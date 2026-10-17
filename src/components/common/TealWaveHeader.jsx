import React from 'react';
import {View, StyleSheet, useWindowDimensions} from 'react-native';
import Svg, {Path, Defs, LinearGradient, Stop} from 'react-native-svg';
import {clamp, getWidthScale} from '../../theme/responsive';

export default function TealWaveHeader({children}) {
  const {width} = useWindowDimensions();
  const height = clamp(260 * getWidthScale(width), 234, 292);
  return (
    <View style={[styles.container, {height}]}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0F7C7C" stopOpacity="1" />
            <Stop offset="1" stopColor="#14A098" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Solid teal background block */}
        <Path
          d={`M0,0 H${width} V${height} H0 Z`}
          fill="url(#tealGrad)"
        />
        {/* Lighter translucent wave layer (back) */}
        <Path
            d={`M0,${height - 70}
              C ${width * 0.25},${height - 130} ${width * 0.5},${height - 20} ${width * 0.75},${height - 90}
              C ${width * 0.9},${height - 130} ${width},${height - 100} ${width},${height - 100}
              L ${width},${height} L 0,${height} Z`}
          fill="#FFFFFF"
          opacity={0.15}
        />
        {/* Main white wave (foreground, creates the curve into the page background) */}
        <Path
            d={`M0,${height - 40}
              C ${width * 0.2},${height - 100} ${width * 0.35},${height + 10} ${width * 0.55},${height - 50}
              C ${width * 0.75},${height - 110} ${width * 0.9},${height - 10} ${width},${height - 40}
              L ${width},${height} L 0,${height} Z`}
          fill="#F3F5F7"
        />
      </Svg>
      {/* Header content goes on top of the wave */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
