/**
 * Simple Notification Popup
 * -------------------------
 * Simple popup for success, warning, and info messages.
 * Auto-dismisses after a specified duration.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

// Icons
import { 
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon,
  AlertTriangleIcon
} from '../../assets/icons/Icons';

const { width: screenWidth } = Dimensions.get('window');

export default function SimpleNotificationPopup({
  visible,
  type = 'info', // 'success', 'warning', 'info', 'error'
  title,
  message,
  duration = 3000,
  onDismiss
}) {
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Animate out
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success_notification':
      case 'success':
        return {
          icon: <CheckCircleIcon size={24} color={colors.success} />,
          backgroundColor: colors.success,
          textColor: colors.white,
          borderColor: colors.success
        };
      
      case 'warning_notification':  
      case 'warning':
        return {
          icon: <AlertTriangleIcon size={24} color={colors.warning} />,
          backgroundColor: colors.warning,
          textColor: colors.white,
          borderColor: colors.warning
        };
      
      case 'error':
        return {
          icon: <XCircleIcon size={24} color={colors.error} />,
          backgroundColor: colors.error,
          textColor: colors.white,
          borderColor: colors.error
        };
      
      default: // info
        return {
          icon: <InfoIcon size={24} color={colors.primary} />,
          backgroundColor: colors.primary,
          textColor: colors.white,
          borderColor: colors.primary
        };
    }
  };

  if (!visible) return null;

  const typeConfig = getTypeConfig();

  const animatedStyle = {
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-100, 0],
        }),
      },
    ],
    opacity: animatedValue,
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[
        styles.container,
        { backgroundColor: typeConfig.backgroundColor },
        animatedStyle
      ]}>
        <TouchableOpacity
          style={styles.content}
          onPress={handleDismiss}
          activeOpacity={0.9}
        >
          <View style={styles.iconContainer}>
            {typeConfig.icon}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: typeConfig.textColor }]}>
              {title}
            </Text>
            {message && (
              <Text style={[styles.message, { color: typeConfig.textColor }]}>
                {message}
              </Text>
            )}
          </View>

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <XCircleIcon 
              size={20} 
              color={typeConfig.textColor} 
              style={{ opacity: 0.8 }}
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Progress bar */}
        <Animated.View 
          style={[
            styles.progressBar,
            {
              backgroundColor: typeConfig.textColor,
              width: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }
          ]} 
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    paddingHorizontal: spacing.lg,
    paddingTop: 50, // Status bar + margin
  },
  container: {
    borderRadius: radius.lg,
    ...shadows.lg,
    elevation: 10,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    opacity: 0.9,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  progressBar: {
    height: 3,
    opacity: 0.3,
  },
});