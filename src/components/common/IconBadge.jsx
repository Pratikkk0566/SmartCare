import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createLightBg } from '../../theme/colorHelpers';
import {useResponsive} from '../../theme/responsive';

/**
 * Reusable icon badge component
 * Replaces inline style patterns like: {backgroundColor: color + '20'}
 */
export default function IconBadge({ 
  Icon, 
  color, 
  size = 40, 
  iconSize = 20,
  style 
}) {
  const {scale} = useResponsive();
  const scaledSize = scale(size);
  const scaledIconSize = scale(iconSize);
  const containerStyle = {
    width: scaledSize,
    height: scaledSize,
    borderRadius: scaledSize / 2,
    backgroundColor: createLightBg(color),
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Icon size={scaledIconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
