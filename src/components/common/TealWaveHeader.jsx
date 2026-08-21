import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import Svg, {Path, Defs, LinearGradient, Stop} from 'react-native-svg';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = 260;

export default function TealWaveHeader({children}) {
  return (
    <View style={styles.container}>
      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0F7C7C" stopOpacity="1" />
            <Stop offset="1" stopColor="#14A098" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Solid teal background block */}
        <Path
          d={`M0,0 H${WIDTH} V${HEIGHT} H0 Z`}
          fill="url(#tealGrad)"
        />
        {/* Lighter translucent wave layer (back) */}
        <Path
          d={`M0,${HEIGHT - 70}
              C ${WIDTH * 0.25},${HEIGHT - 130} ${WIDTH * 0.5},${HEIGHT - 20} ${WIDTH * 0.75},${HEIGHT - 90}
              C ${WIDTH * 0.9},${HEIGHT - 130} ${WIDTH},${HEIGHT - 100} ${WIDTH},${HEIGHT - 100}
              L ${WIDTH},${HEIGHT} L 0,${HEIGHT} Z`}
          fill="#FFFFFF"
          opacity={0.15}
        />
        {/* Main white wave (foreground, creates the curve into the page background) */}
        <Path
          d={`M0,${HEIGHT - 40}
              C ${WIDTH * 0.2},${HEIGHT - 100} ${WIDTH * 0.35},${HEIGHT + 10} ${WIDTH * 0.55},${HEIGHT - 50}
              C ${WIDTH * 0.75},${HEIGHT - 110} ${WIDTH * 0.9},${HEIGHT - 10} ${WIDTH},${HEIGHT - 40}
              L ${WIDTH},${HEIGHT} L 0,${HEIGHT} Z`}
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
