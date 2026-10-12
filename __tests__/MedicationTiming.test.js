jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/services/LocalAlarmManager', () => ({localAlarmManager:{schedule:jest.fn(),cancel:jest.fn(),ensureChannel:jest.fn(),rescheduleUpcomingAlarms:jest.fn().mockResolvedValue({scheduled:3})}}));
jest.mock('../src/API/Api', () => ({PrescriptionRepeatApi:{}}));
import AsyncStorage from '@react-native-async-storage/async-storage';
import {medicationEngineService as service} from '../src/services/MedicationEngineService';
import {localAlarmManager} from '../src/services/LocalAlarmManager';
import {DEFAULT_MEDICATION_TIMING_CONFIG, normalizeTime} from '../src/services/MedicationSchedulingEngine';
const rx={prescriptionId:'routine-rx',patientId:'patient',medicines:[{
 medicinePrescriptionId:'routine-med',medicineId:'med',medicineName:'Test medicine',quantity:3,
 frequency:'1-1-1',startDate:'2099-01-01',timezoneOffset:'+05:30',
}]};
beforeEach(async () => {await AsyncStorage.clear();jest.clearAllMocks();service._initialized=false;service.engine.timingConfig=DEFAULT_MEDICATION_TIMING_CONFIG;});
const afternoon=async () => (await service.store.listSchedules()).find(s=>s.slot==='AFTERNOON');
test('routine popup edits update medication, persisted schedule and alarm, replacing old OS delivery',async () => {
 await service.syncPrescriptions([rx],{patientId:'patient'});
 const before=await afternoon();expect(before.scheduledTime).toBe('14:00');
 const old=(await service.store.listAlarms()).find(a=>a.scheduleId===before.id);
 await service.updateTimingConfig({AFTERNOON:'16:25'});
 const after=await afternoon();
 expect(after.id).toBe(before.id);expect(after.scheduledTime).toBe('16:25');
 expect(after.scheduledAt).toBe('2099-01-01T16:25:00+05:30');
 expect((await service.store.getMedication((await service.store.listMedications())[0].id)).timingProfile.AFTERNOON).toBe('16:25');
 const alarm=await service.store.getAlarm(old.alarmId);
 expect(alarm.scheduledAt).toBe(after.scheduledAt);
 expect(localAlarmManager.cancel).toHaveBeenCalledWith(old.notificationId);
 expect(localAlarmManager.rescheduleUpcomingAlarms).toHaveBeenCalled();
 // Subsequent HIS sync and simulated restart must not restore the default 2 PM.
 await service.syncPrescriptions([rx],{patientId:'patient'});
 expect((await afternoon()).scheduledTime).toBe('16:25');
 service._initialized=false;service.engine.timingConfig=DEFAULT_MEDICATION_TIMING_CONFIG;
 await service.init();await service.syncPrescriptions([rx],{patientId:'patient'});
 expect((await afternoon()).scheduledTime).toBe('16:25');
});
test('invalid times fail before replacing a saved routine',async () => {
 await service.updateTimingConfig({AFTERNOON:'16:25'});
 await expect(service.updateTimingConfig({AFTERNOON:'25:90'})).rejects.toThrow();
 expect((await service.store.getTimingConfig()).AFTERNOON).toBe('16:25');
});
test('taken and skipped dose history retains original times when routine changes',async () => {
 await service.syncPrescriptions([rx],{patientId:'patient'});
 const dose=await afternoon();await service.markSkipped(dose.id,'Test');
 await service.updateTimingConfig({AFTERNOON:'18:10'});
 const after=await afternoon();expect(after.status).toBe('SKIPPED');expect(after.scheduledAt).toBe(dose.scheduledAt);
 expect((await service.store.listAlarms()).find(a=>a.scheduleId===dose.id).status).toBe('CANCELLED');
});

test('moving today dose into the past cancels its previous future alarm',async () => {
 const now=new Date('2099-01-01T10:00:00+05:30');
 await service.init();await service.engine.syncPrescription(rx,{now});
 const dose=await afternoon();const alarm=(await service.store.listAlarms()).find(a=>a.scheduleId===dose.id);
 service.engine.patientTimingProfile={AFTERNOON:'08:30'};
 await service.engine.syncPrescription(rx,{now});
 expect((await afternoon()).scheduledTime).toBe('08:30');
 expect((await service.store.getAlarm(alarm.alarmId)).status).toBe('CANCELLED');
 expect(localAlarmManager.cancel).toHaveBeenCalledWith(alarm.notificationId);
});

test.each([['12:00 AM','00:00'],['12:00 PM','12:00'],['01:05 PM','13:05'],['11:59 PM','23:59'],['8:30 am','08:30'],['14:00','14:00']])('normalizes %s into %s', (input,expected)=>{expect(normalizeTime(input)).toBe(expected);});
test.each(['00:15 AM','13:00 PM','12:60 PM','12:99 AM','2:30 XM','2:30 PM garbage','25:00','14:00junk','8 PM','08:30:40'])('rejects invalid time %s', input=>{expect(()=>normalizeTime(input)).toThrow();});
