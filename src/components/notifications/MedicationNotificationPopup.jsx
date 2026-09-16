/**
 * Medication Notification Popup
 * ----------------------------
 * In-app popup notification for medication reminders.
 * Shows when the app is in foreground and a medication alarm fires.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Alert
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

// Icons
import { 
  PillIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BellIcon
} from '../../assets/icons/Icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function MedicationNotificationPopup({
  visible,
  medicationData,
  onTake,
  onSkip,
  onSnooze,
  onDismiss,
  isOverdue = false
}) {
  const [animatedValue] = useState(new Animated.Value(0));
  const [pulseValue] = useState(new Animated.Value(1));
  const timeoutRef = useRef(null);

  // Auto-dismiss after 30 seconds if not interacted with
  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Start pulse animation for urgent reminders
      if (isOverdue) {
        startPulseAnimation();
      }

      // Auto-dismiss timer
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 30000); // 30 seconds

    } else {
      // Animate out
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, isOverdue]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleTake = () => {
    console.log('[MedicationPopup] Medicine taken');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onTake?.(medicationData);
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Medicine?',
      `Are you sure you want to skip ${medicationData?.medicineName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            console.log('[MedicationPopup] Medicine skipped');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            onSkip?.(medicationData);
          }
        }
      ]
    );
  };

  const handleSnooze = () => {
    Alert.alert(
      'Snooze Reminder',
      'How long would you like to snooze this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '5 minutes', 
          onPress: () => snoozeForMinutes(5)
        },
        { 
          text: '15 minutes', 
          onPress: () => snoozeForMinutes(15)
        },
        { 
          text: '30 minutes', 
          onPress: () => snoozeForMinutes(30)
        }
      ]
    );
  };

  const snoozeForMinutes = (minutes) => {
    console.log('[MedicationPopup] Snoozed for', minutes, 'minutes');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onSnooze?.(medicationData, minutes);
  };

  const handleDismiss = () => {
    console.log('[MedicationPopup] Dismissed');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onDismiss?.();
  };

  if (!visible || !medicationData) return null;

  const animatedStyle = {
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-screenHeight, 0],
        }),
      },
      {
        scale: pulseValue,
      }
    ],
    opacity: animatedValue,
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.container,
          isOverdue && styles.urgentContainer,
          animatedStyle
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <PillIcon 
                size={24} 
                color={isOverdue ? colors.white : colors.primary} 
              />
              {isOverdue && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>!</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <XCircleIcon size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[
              styles.title,
              isOverdue && styles.urgentTitle
            ]}>
              {isOverdue ? '🚨 OVERDUE MEDICATION' : '💊 Medication Reminder'}
            </Text>
            
            <Text style={[
              styles.medicineName,
              isOverdue && styles.urgentMedicineName
            ]}>
              {medicationData.medicineName}
            </Text>
            
            <Text style={[
              styles.dosageInfo,
              isOverdue && styles.urgentText
            ]}>
              {medicationData.dosage}
              {medicationData.scheduledTime && ` • Scheduled for ${medicationData.scheduledTime}`}
            </Text>
            
            {medicationData.foodInstruction && (
              <Text style={[
                styles.foodInstruction,
                isOverdue && styles.urgentText
              ]}>
                📝 {medicationData.foodInstruction}
              </Text>
            )}

            {isOverdue && (
              <View style={styles.overdueWarning}>
                <ClockIcon size={16} color={colors.white} />
                <Text style={styles.overdueText}>
                  This medication is overdue. Please take it as soon as possible.
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.takeButton]}
              onPress={handleTake}
              activeOpacity={0.8}
            >
              <CheckCircleIcon size={18} color={colors.white} />
              <Text style={styles.takeButtonText}>Take Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.snoozeButton]}
              onPress={handleSnooze}
              activeOpacity={0.8}
            >
              <ClockIcon size={18} color={colors.primary} />
              <Text style={styles.snoozeButtonText}>Snooze</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <XCircleIcon size={18} color={colors.error} />
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }
              ]} 
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60, // Status bar + some margin
  },
  container: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    maxWidth: screenWidth - spacing.lg * 2,
    ...shadows.lg,
    elevation: 10,
  },
  urgentContainer: {
    backgroundColor: colors.error,
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconContainer: {
    position: 'relative',
  },
  urgentBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.warning,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dismissButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  urgentTitle: {
    color: colors.white,
    textAlign: 'center',
  },
  medicineName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  urgentMedicineName: {
    color: colors.white,
  },
  dosageInfo: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  foodInstruction: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  overdueText: {
    color: colors.white,
    fontSize: 14,
    marginLeft: spacing.xs,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  takeButton: {
    backgroundColor: colors.success,
  },
  takeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  snoozeButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  snoozeButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.error,
  },
  skipButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});