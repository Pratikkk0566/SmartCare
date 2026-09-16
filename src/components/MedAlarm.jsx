import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import {
  IconHeartbeat,
  IconPill,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconX,
} from '@tabler/icons-react-native';

const { width } = Dimensions.get('window');

const MedAlarm = ({
  medicationName,
  dosage,
  time = '4:28 PM',
  foodInstruction,
  onTaken,
  onSnooze,
  onSkip,
  onClose,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.alarmCard}>

        {/* ------------------------------------------------ */}
        {/* HEADER WITH BRAND AND CLOSE                     */}
        {/* ------------------------------------------------ */}

        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <IconHeartbeat
              size={24}
              color="#4ADE80"
              stroke={2}
            />
            <Text style={styles.brandText}>
              SmartCare PHR
            </Text>
          </View>

          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconX
                size={24}
                color="#9CA3AF"
                stroke={2}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ------------------------------------------------ */}
        {/* MEDICATION INFO                                  */}
        {/* ------------------------------------------------ */}

        <View style={styles.medicationSection}>
          <View style={styles.pillIconContainer}>
            <IconPill
              size={32}
              color="#FFFFFF"
              stroke={2}
            />
          </View>

          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>
              {medicationName} {dosage}
            </Text>
            
            <View style={styles.timeRow}>
              <IconClock
                size={16}
                color="#9CA3AF"
                stroke={2}
              />
              <Text style={styles.timeText}>
                Today, {time}
              </Text>
            </View>
          </View>
        </View>

        {/* ------------------------------------------------ */}
        {/* ACTION BUTTONS - HORIZONTAL ROW                  */}
        {/* ------------------------------------------------ */}

        <View style={styles.actionsRow}>
          
          {/* TAKEN BUTTON */}
          <TouchableOpacity
            style={[styles.actionButton, styles.takenButton]}
            onPress={onTaken}
            activeOpacity={0.8}
          >
            <IconCheck
              size={20}
              color="#FFFFFF"
              stroke={2.5}
            />
            <Text style={styles.actionText}>Taken</Text>
          </TouchableOpacity>

          {/* SNOOZE BUTTON */}
          <TouchableOpacity
            style={[styles.actionButton, styles.snoozeButton]}
            onPress={onSnooze}
            activeOpacity={0.8}
          >
            <IconClock
              size={20}
              color="#92400E"
              stroke={2}
            />
            <Text style={[styles.actionText, styles.snoozeText]}>Snooze</Text>
          </TouchableOpacity>

          {/* SKIP BUTTON */}
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={onSkip}
            activeOpacity={0.8}
          >
            <IconX
              size={20}
              color="#FFFFFF"
              stroke={2}
            />
            <Text style={styles.actionText}>Skip</Text>
          </TouchableOpacity>

        </View>

      </View>
    </View>
  );
};

export default MedAlarm;

const styles = StyleSheet.create({

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  alarmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1F2937',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },

  /* ------------------------------------------------------ */
  /* HEADER                                                 */
  /* ------------------------------------------------------ */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  closeButton: {
    padding: 4,
  },

  /* ------------------------------------------------------ */
  /* MEDICATION                                             */
  /* ------------------------------------------------------ */

  medicationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  pillIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FB923C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  medicationInfo: {
    flex: 1,
  },

  medicationName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timeText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginLeft: 6,
  },

  /* ------------------------------------------------------ */
  /* ACTIONS ROW                                            */
  /* ------------------------------------------------------ */

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  /* TAKEN BUTTON */
  takenButton: {
    backgroundColor: '#10B981',
  },

  /* SNOOZE BUTTON */
  snoozeButton: {
    backgroundColor: '#F59E0B',
  },

  /* SKIP BUTTON */
  skipButton: {
    backgroundColor: '#6B7280',
  },

  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  snoozeText: {
    color: '#92400E',
  },

});