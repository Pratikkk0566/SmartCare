import React from 'react';
import { Modal } from 'react-native';
import MedicationAlarmView from '../medication/MedicationAlarmView';
export default function MedicationNotificationPopup({
  visible,
  medicationData,
  onTake,
  onSkip,
  onSnooze,
  onDismiss,
  isOverdue = false,
}) {
  if (!visible || !medicationData) return null;
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <MedicationAlarmView
        medicationData={medicationData}
        isOverdue={isOverdue}
        onTake={() => onTake?.(medicationData)}
        onSkip={() => onSkip?.(medicationData)}
        onSnooze={minutes => onSnooze?.(medicationData, minutes)}
        onDismiss={onDismiss}
      />
    </Modal>
  );
}
