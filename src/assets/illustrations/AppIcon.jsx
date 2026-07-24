import React from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Path, Polyline} from 'react-native-svg';

export default function AppIcon({size = 80}) {
  const r = size * 0.25;
  return (
    <View style={[styles.container, {width: size, height: size, borderRadius: r, backgroundColor: '#6C63FF'}]}>
      <Svg width={size * 0.65} height={size * 0.4} viewBox="0 0 52 28" fill="none">
        <Polyline
          points="0,14 8,14 12,4 18,24 24,8 30,20 36,14 44,14 48,10 52,14"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
