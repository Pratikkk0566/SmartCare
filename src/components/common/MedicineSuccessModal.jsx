/**
 * Medicine Success Modal
 * ----------------------
 * Beautiful animated modal that appears when medicine is taken successfully
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { CheckCircleIcon } from '../../assets/icons/Icons';

const { width } = Dimensions.get('window');

export default function MedicineSuccessModal({ 
  visible, 
  onClose, 
  medicineName,
  dose,
  time 
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Delay check icon animation
      setTimeout(() => {
        Animated.spring(checkScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
          friction: 5,
        }).start();
      }, 150);

      // Auto close after 2.5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkScaleAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Animated Check Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: checkScaleAnim }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <CheckCircleIcon size={48} color="#fff" />
            </View>
            {/* Pulse ring effect */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: checkScaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [
                    {
                      scale: checkScaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.5],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>

          {/* Success Message */}
          <Text style={styles.title}>Dose Recorded! ✓</Text>
          
          {/* Medicine Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Medicine</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {medicineName}
              </Text>
            </View>
            
            {dose && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dosage</Text>
                <Text style={styles.detailValue}>{dose}</Text>
              </View>
            )}
            
            {time && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{time}</Text>
              </View>
            )}
          </View>

          {/* Encouragement Message */}
          <Text style={styles.encouragement}>
            Great job staying on track! 🎯
          </Text>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.xl,
    margin: spacing.xl,
    width: width - spacing.xl * 2,
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.lg,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    position: 'relative',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    opacity: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 0.6,
    textAlign: 'right',
  },
  encouragement: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  closeButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
