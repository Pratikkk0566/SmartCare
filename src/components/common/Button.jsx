import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../../theme/colors';
import {radius} from '../../theme/radius';
import {spacing} from '../../theme/spacing';

const Button = React.memo(function Button({title, onPress, disabled, loading, variant = 'primary', style, textStyle}) {
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.outline, disabled && styles.disabled, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.75}>
        <Text style={[styles.outlineText, textStyle]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  // TouchableOpacity is now the OUTER element — fixes Android touch delay
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.touchable, style]}>
      <LinearGradient
        colors={disabled ? ['#C4B5FD', '#A78BFA'] : [colors.primary, colors.primaryDark]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.gradient}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={[styles.text, textStyle]}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
});

export default Button;

const styles = StyleSheet.create({
  touchable: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {opacity: 0.6},
});