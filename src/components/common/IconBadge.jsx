import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createLightBg } from '../../theme/colorHelpers';

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
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: createLightBg(color),
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Icon size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
