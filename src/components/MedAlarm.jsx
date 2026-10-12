import React from 'react';
import MedicationAlarmView from './medication/MedicationAlarmView';
/** Shared fullscreen presentation for notification launches and in-app reminders. */
export default function MedAlarm({
  medicationName,
  dosage,
  time,
  foodInstruction,
  onTaken,
  onSnooze,
  onSkip,
  onClose,
}) {
  return (
    <MedicationAlarmView
      medicationData={{
        medicineName: medicationName,
        dosage,
        displayTime: time,
        foodInstruction,
      }}
      onTake={onTaken}
      onSkip={onSkip}
      onSnooze={onSnooze}
      onDismiss={onClose}
    />
  );
}
