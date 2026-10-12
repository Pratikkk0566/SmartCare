import {displayStandardNotification} from '../src/services/StandardNotificationService';
jest.mock('../src/services/MedicationEngineService', () => ({
  medicationEngineService: {
    init: jest.fn().mockResolvedValue(),
    markTaken: jest.fn(),
    markSkipped: jest.fn(),
    snooze: jest.fn(),
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    displayNotification: jest.fn().mockResolvedValue('feedback'),
    setNotificationCategories: jest.fn(),
    cancelNotification: jest.fn(),
    cancelDisplayedNotification: jest.fn(),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
    getNotificationSettings: jest
      .fn()
      .mockResolvedValue({ authorizationStatus: 1, android: { alarm: 1 } }),
    createTriggerNotification: jest.fn().mockResolvedValue('ok'),
  },
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidStyle: { BIGTEXT: 1 },
  AndroidNotificationSetting: { DISABLED: 0 },
  AuthorizationStatus: { AUTHORIZED: 1 },
  EventType: { PRESS: 1, ACTION_PRESS: 2, DELIVERED: 3 },
  TriggerType: { TIMESTAMP: 0 },
}));
import { medicationEngineService } from '../src/services/MedicationEngineService';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { AsyncStorageMedicationStore } from '../src/services/AsyncStorageMedicationStore';
import { LocalAlarmManager } from '../src/services/LocalAlarmManager';
import {
  MedicationSchedulingEngine,
  runMedicationEngineSelfTests,
} from '../src/services/MedicationSchedulingEngine';
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
test('schedule IDs and concurrent writes preserve unrelated records', async () => {
  const a = new AsyncStorageMedicationStore(),
    b = new AsyncStorageMedicationStore();
  await Promise.all([
    a.saveSchedule({ id: 'a', status: 'SCHEDULED' }),
    b.saveSchedule({ id: 'b', status: 'SCHEDULED' }),
  ]);
  expect(await a.listSchedules()).toHaveLength(2);
  await b.saveSchedule({ id: 'a', status: 'TAKEN' });
  expect((await a.getSchedule('b')).status).toBe('SCHEDULED');
});
test.each([
  ['android', 50],
  ['ios', 60],
])(
  'native queue respects %s cap and preserves the full persistent course',
  async (platform, cap) => {
    Platform.OS = platform;
    const m = new LocalAlarmManager();
    for (let i = 0; i < 70; i++) {
      await m.store.saveSchedule({ id: 's' + i, status: 'SCHEDULED' });
      await m.store.saveAlarm({
        alarmId: 'a' + i,
        notificationId: 'n' + i,
        scheduleId: 's' + i,
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + (i + 1) * 60000).toISOString(),
      });
    }
    const result = await m.rescheduleUpcomingAlarms();
    expect(result.scheduled).toBe(cap);
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(cap);
    expect(await m.store.listAlarms()).toHaveLength(70);
  },
);
test('snooze starts from action time, cancels old delivery and enforces three snoozes', async () => {
  const store = new AsyncStorageMedicationStore();
  const notifications = { schedule: jest.fn(), cancel: jest.fn() };
  const engine = new MedicationSchedulingEngine({
    store,
    notificationManager: notifications,
  });
  const now = new Date();
  const s = {
    id: 'dose',
    status: 'SCHEDULED',
    scheduledAt: new Date(now.getTime() + 3600000).toISOString(),
  };
  await store.saveSchedule(s);
  await engine.upsertAlarmForSchedule(s, now);
  for (let i = 0; i < 3; i++) await engine.snooze('dose', 15, { now });
  expect((await store.getSchedule('dose')).snoozedUntil).toBe(
    new Date(now.getTime() + 900000).toISOString(),
  );
  expect(notifications.cancel).toHaveBeenCalledTimes(3);
  await expect(engine.snooze('dose', 15, { now })).rejects.toThrow('Maximum');
});
test('existing engine diagnostics pass', async () => {
  const result = await runMedicationEngineSelfTests();
  expect(result.passed).toBe(true);
});

test('denied permissions retain alarms and cancel terminal notifications', async () => {
  const m = new LocalAlarmManager();
  await m.store.saveSchedule({ id: 's', status: 'TAKEN' });
  await m.store.saveAlarm({
    alarmId: 'a',
    notificationId: 'n',
    scheduleId: 's',
    status: 'CANCELLED',
    scheduledAt: new Date(Date.now() + 60000).toISOString(),
  });
  notifee.getNotificationSettings.mockResolvedValueOnce({
    authorizationStatus: 0,
  });
  expect((await m.rescheduleUpcomingAlarms()).reason).toBe(
    'notifications-disabled',
  );
  expect(notifee.cancelNotification).toHaveBeenCalledWith('n');
  expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  expect(await m.store.listAlarms()).toHaveLength(1);
});

test('duplicate snooze action ignores stale notification data', async () => {
  const m = new LocalAlarmManager(),
    at = new Date().toISOString();
  await m.store.saveSchedule({ id: 's', status: 'SCHEDULED' });
  await m.store.saveAlarm({
    alarmId: 'a',
    scheduleId: 's',
    status: 'FIRED',
    scheduledAt: at,
  });
  medicationEngineService.snooze.mockImplementation(async () => {
    await m.store.saveAlarm({
      alarmId: 'a',
      scheduleId: 's',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 900000).toISOString(),
    });
  });
  const data = { scheduleId: 's', alarmId: 'a', scheduledAt: at };
  await Promise.all([
    m.handleNotificationAction('snooze_15', data),
    m.handleNotificationAction('snooze_15', data),
  ]);
  expect(medicationEngineService.snooze).toHaveBeenCalledTimes(1);
});

test('Android medication notification uses bundled looping alarm sound with a timeout', () => {
  Platform.OS = 'android';
  const notification = new LocalAlarmManager().notification({notificationId:'sound-dose',alarmId:'a',scheduleId:'s'});
  expect(notification.android.sound).toBe('medication_alarm');
  expect(notification.android.channelId).toBe('medication-audible-alarms-v4');
  expect(notification.android.loopSound).toBe(true);
  expect(notification.android.timeoutAfter).toBe(60000);
});

test('ringtone selection persists and rebuilds notifications on its own Android channel', async () => {
 Platform.OS='android';const manager=new LocalAlarmManager();
 await manager.setRingtone('gentle');
 expect(await new LocalAlarmManager().getRingtone()).toBe('gentle');
 const notification=manager.notification({notificationId:'ringtone',alarmId:'a',scheduleId:'s'});
 expect(notification.android.sound).toBe('medication_gentle');
 expect(notification.android.channelId).toBe('medication-audible-alarms-v4-gentle');
 await expect(manager.setRingtone('missing-tone')).rejects.toThrow('Unknown');
});

test('normal notifications use a short default sound without an alarm ringtone or loop', async()=>{
 Platform.OS='android';await displayStandardNotification({title:'Dose taken',body:'Recorded'});
 const notification=notifee.displayNotification.mock.calls[0][0];
 expect(notification.android.channelId).toBe('smartcare-notifications-v1');
 expect(notification.android.sound).toBe('default');expect(notification.android.loopSound).toBe(false);
});

test('Android alarm launches the dedicated lock-screen activity and offers five-minute snooze',()=>{
 Platform.OS='android';const notification=new LocalAlarmManager().notification({notificationId:'alarm-ui',scheduleId:'dose',alarmId:'a'});
 expect(notification.android.fullScreenAction.launchActivity).toBe('com.sus.MedicationAlarmActivity');
 expect(notification.android.fullScreenAction.mainComponent).toBe('SmartCareMedicationAlarm');
 expect(notification.android.actions[1].pressAction.id).toBe('snooze_5');
});
