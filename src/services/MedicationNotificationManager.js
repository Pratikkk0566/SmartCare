import { localAlarmManager } from './LocalAlarmManager';
/** Compatibility transport for MedicationSchedulingEngine. */
export class MedicationNotificationManager {
  schedule(a) {
    return localAlarmManager.schedule(a);
  }
  cancel(id) {
    return localAlarmManager.cancel(id);
  }
  ensureChannel() {
    return localAlarmManager.ensureChannel();
  }
  triggerImmediateTest() {
    return localAlarmManager.scheduleTestAlarm();
  }
}
