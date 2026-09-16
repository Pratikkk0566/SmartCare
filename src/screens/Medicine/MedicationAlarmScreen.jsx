import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import MedAlarm from '../../components/MedAlarm';
import { sqliteDataService } from '../../services/SQLiteDataService';
import { localAlarmManager } from '../../services/LocalAlarmManager';

const MedicationAlarmScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  
  const {
    doseId,
    medicationId,
    alarmId,
    medicationName,
    dosage,
    scheduledTime,
    foodInstruction
  } = route.params || {};

  const [isProcessing, setIsProcessing] = useState(false);

  const formatTime = (timeString) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timeString;
    }
  };

  const formatFoodInstruction = (instruction) => {
    const instructionMap = {
      'before_food': '🍽️ Take before food',
      'after_food': '🍽️ Take after food', 
      'with_food': '🍽️ Take with food',
      'empty_stomach': '🫗 Take on empty stomach',
      'anytime': '⏰ Take anytime'
    };
    
    return instructionMap[instruction] || instruction;
  };

  const handleMedicationAction = async (action) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      console.log(`[MedicationAlarmScreen] Processing ${action} for dose:`, doseId);
      
      switch (action) {
        case 'taken':
          await handleTaken();
          break;
        case 'skipped':
          await handleSkip();
          break;
        case 'snoozed':
          await handleSnooze();
          break;
      }
      
    } catch (error) {
      console.error(`[MedicationAlarmScreen] Error processing ${action}:`, error);
      Alert.alert('Error', `Failed to record ${action} action. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaken = async () => {
    console.log('[MedicationAlarmScreen] Recording medication as taken');

    try {
      // Record in SQLite medication_history
      await sqliteDataService.takeMedicine(doseId, 'Taken via medication alarm');
      
      // Cancel any active alarm
      if (alarmId) {
        await localAlarmManager.cancelAlarm(alarmId);
      }

      Alert.alert(
        '✅ Medication Recorded',
        `${medicationName} has been marked as taken.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error('[MedicationAlarmScreen] Error recording taken:', error);
      throw error;
    }
  };

  const handleSnooze = async () => {
    console.log('[MedicationAlarmScreen] Snoozing medication alarm');

    try {
      // Snooze the alarm (default 15 minutes)
      if (alarmId) {
        const success = await localAlarmManager.snoozeAlarm(alarmId, 15);
        
        if (success) {
          Alert.alert(
            '⏰ Alarm Snoozed',
            `${medicationName} reminder will alert again in 15 minutes.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
        } else {
          // Snooze limit reached
          Alert.alert(
            '⚠️ Snooze Limit Reached',
            'Maximum snoozes reached. Please take your medication now or mark as skipped.',
            [
              { text: 'Take Now', onPress: () => handleMedicationAction('taken') },
              { text: 'Skip', onPress: () => handleMedicationAction('skipped') },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      } else {
        throw new Error('No alarm ID provided for snooze');
      }

    } catch (error) {
      console.error('[MedicationAlarmScreen] Error snoozing:', error);
      throw error;
    }
  };

  const handleSkip = async () => {
    console.log('[MedicationAlarmScreen] Recording medication as skipped');

    // Confirm skip action
    Alert.alert(
      'Skip Medication?',
      `Are you sure you want to skip ${medicationName}? This will be recorded in your medication history.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              // Record in SQLite medication_history
              await sqliteDataService.skipMedicine(doseId, 'Skipped via medication alarm');
              
              // Cancel any active alarm
              if (alarmId) {
                await localAlarmManager.cancelAlarm(alarmId);
              }

              Alert.alert(
                '⚠️ Medication Skipped',
                `${medicationName} has been marked as skipped.`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );

            } catch (error) {
              console.error('[MedicationAlarmScreen] Error recording skip:', error);
              Alert.alert('Error', 'Failed to record skip action. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleClose = () => {
    console.log('[MedicationAlarmScreen] Alarm dismissed without action');
    
    Alert.alert(
      'Close Alarm?',
      'This will close the medication alarm without taking any action. The reminder will continue to show until you take, skip, or snooze the medication.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close', 
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // Validate required props
  if (!doseId || !medicationName) {
    Alert.alert(
      'Invalid Alarm Data',
      'This alarm is missing required information. Returning to previous screen.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
    return null;
  }

  return (
    <View style={styles.container}>
      <MedAlarm
        medicationName={medicationName}
        dosage={dosage}
        time={formatTime(scheduledTime)}
        foodInstruction={foodInstruction ? formatFoodInstruction(foodInstruction) : undefined}
        
        onTaken={() => handleMedicationAction('taken')}
        onSnooze={() => handleMedicationAction('snoozed')}
        onSkip={() => handleMedicationAction('skipped')}
        onClose={handleClose}
      />
    </View>
  );
};

export default MedicationAlarmScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A211E',
  },
});