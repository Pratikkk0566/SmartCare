/** Native transport for persisted AlarmEntry records; no network access. */
import notifee, {
  AndroidImportance,
  AndroidStyle,
  AndroidNotificationSetting,
  AuthorizationStatus,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import { AppState, Platform, Alert, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageMedicationStore } from './AsyncStorageMedicationStore';
// Sound settings are immutable after channel creation; migrate to a new channel.
const CHANNEL = 'medication-audible-alarms-v4';
const RINGTONE_KEY = '@medication_alarm_ringtone';
const RINGTONES = {
  alarm: 'medication_alarm',
  gentle: 'medication_gentle',
  system: 'default',
};
const CATEGORY = 'medication-dose';
const PENDING = '@medication_pending_open';
const service = () =>
  require('./MedicationEngineService').medicationEngineService;
export class LocalAlarmManager {
  constructor() {
    this.store = new AsyncStorageMedicationStore();
    this.queue = Promise.resolve();
    this.actionQueue = Promise.resolve();
    this.channelId = CHANNEL;
    this.ringtoneSound = RINGTONES.alarm;
  }
  async getRingtone() {
    if (Platform.OS !== 'android') return 'system';
    const stored = await AsyncStorage.getItem(RINGTONE_KEY);
    return Object.prototype.hasOwnProperty.call(RINGTONES, stored)
      ? stored
      : 'alarm';
  }
  async setRingtone(id) {
    if (!Object.prototype.hasOwnProperty.call(RINGTONES, id))
      throw new Error('Unknown alarm ringtone');
    if (Platform.OS !== 'android' && id !== 'system')
      throw new Error('Custom alarm tones are available on Android');
    await AsyncStorage.setItem(RINGTONE_KEY, id);
    await this.rescheduleUpcomingAlarms();
  }
  async openRingtoneSettings() {
    await this.ensureChannel();
    return notifee.openNotificationSettings(this.channelId);
  }
  async silenceDoseAlarm(scheduleId) {
    for (const alarm of await this.store.listAlarms())
      if (alarm.scheduleId === scheduleId) {
        await notifee.cancelDisplayedNotification(alarm.notificationId);
      }
  }
  async ensureChannel() {
    const ringtone = await this.getRingtone();
    this.channelId = ringtone === 'alarm' ? CHANNEL : CHANNEL + '-' + ringtone;
    this.ringtoneSound = RINGTONES[ringtone];
    if (Platform.OS === 'android')
      await notifee.createChannel({
        id: this.channelId,
        name: 'Medication reminders',
        importance: AndroidImportance.HIGH,
        sound: this.ringtoneSound,
        vibrationPattern: [500, 500],
        vibration: true,
      });
    else
      await notifee.setNotificationCategories([
        {
          id: CATEGORY,
          actions: [
            { id: 'take', title: 'Take' },
            ...[5, 10, 15, 30].map(m => ({
              id: 'snooze_' + m,
              title: 'Snooze ' + m + ' min',
            })),
            { id: 'skip', title: 'Skip' },
          ],
        },
      ]);
  }
  async requestPermissions() {
    await this.ensureChannel();
    const settings = await notifee.requestPermission();
    if (
      Platform.OS === 'android' &&
      Number(Platform.Version) >= 31 &&
      settings.android?.alarm === AndroidNotificationSetting.DISABLED
    )
      Alert.alert(
        'Allow medication alarms',
        'Enable Alarms & reminders for on-time dose notifications.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Open settings',
            onPress: () => notifee.openAlarmPermissionSettings(),
          },
        ],
      );
    if (
      Platform.OS === 'android' &&
      NativeModules.MedicationAlarmNative &&
      !(await NativeModules.MedicationAlarmNative.canUseFullScreenIntent())
    ) {
      Alert.alert(
        'Allow fullscreen medication alarms',
        'Enable fullscreen alerts so medication alarms can appear over the lock screen.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Open settings',
            onPress: () =>
              NativeModules.MedicationAlarmNative.openFullScreenSettings().catch(
                console.warn,
              ),
          },
        ],
      );
    }
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  }
  async init() {
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      await this.ensureChannel();
      this.unsubscribe = notifee.onForegroundEvent(e =>
        this.handleEvent(e).catch(console.warn),
      );
      this.subscription = AppState.addEventListener('change', state => {
        if (state === 'active') {
          this.rescheduleUpcomingAlarms().catch(console.warn);
          this.flushPendingNavigation().catch(console.warn);
        }
      });
      if (Platform.OS === 'android') {
        const initial = await notifee.getInitialNotification();
        if (initial)
          await this.handleEvent({ type: EventType.PRESS, detail: initial });
      }
      await this.rescheduleUpcomingAlarms();
    })();
    return this.initializing;
  }
  notification(a) {
    const data = Object.fromEntries(
      Object.entries({
        type: 'medication',
        alarmId: a.alarmId,
        scheduleId: a.scheduleId,
        medicineName: a.medicineName,
        scheduledAt: a.scheduledAt,
      })
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    );
    return {
      id: a.notificationId,
      title: 'Time for ' + (a.medicineName || 'your medicine'),
      body: [
        a.dosage && Number(a.dosage) !== 0 ? a.dosage : 'Your prescribed dose',
        a.timingInstruction,
        a.scheduledTime ? 'Scheduled for ' + a.scheduledTime : null,
      ]
        .filter(Boolean)
        .join(' | '),
      data,
      android: {
        channelId: this.channelId,
        sound: this.ringtoneSound,
        loopSound: true,
        timeoutAfter: 60000,
        smallIcon: 'ic_medication_notification',
        importance: AndroidImportance.HIGH,
        category: 'alarm',
        color: '#14A098',
        style: {
          type: AndroidStyle.BIGTEXT,
          text: [
            a.medicineName,
            a.dosage && Number(a.dosage) !== 0
              ? a.dosage
              : 'Your prescribed dose',
            a.timingInstruction,
            a.scheduledTime ? 'Scheduled for ' + a.scheduledTime : null,
          ]
            .filter(Boolean)
            .join('\n'),
        },
        fullScreenAction: {
          id: 'alarm',
          launchActivity: 'com.sus.MedicationAlarmActivity',
          mainComponent: 'SmartCareMedicationAlarm',
        },
        pressAction: {
          id: 'default',
          launchActivity: 'com.sus.MedicationAlarmActivity',
          mainComponent: 'SmartCareMedicationAlarm',
        },
        actions: [
          { title: 'Take', pressAction: { id: 'take' } },
          {
            title: 'Snooze 5 min',
            pressAction: { id: 'snooze_5' },
          },
          { title: 'Skip', pressAction: { id: 'skip' } },
        ],
      },
      ios: {
        categoryId: CATEGORY,
        sound: 'default',
        foregroundPresentationOptions: {
          banner: true,
          list: true,
          sound: true,
          badge: false,
        },
      },
    };
  }
  // The engine already persists every alarm. Reconcile once after a complete mutation.
  async schedule(alarm) {
    return alarm;
  }
  async cancel(id) {
    if (id) await notifee.cancelNotification(id);
  }
  rescheduleUpcomingAlarms(limit = 60) {
    const result = this.queue.then(() => this.reconcile(limit));
    this.queue = result.catch(() => {});
    return result;
  }
  async reconcile(limit) {
    await this.ensureChannel();
    const now = Date.now(),
      alarms = await this.store.listAlarms();
    const schedules = new Map(
      (await this.store.listSchedules()).map(s => [s.id, s]),
    );
    const eligible = alarms
      .filter(
        a =>
          a.status === 'SCHEDULED' &&
          ['SCHEDULED', 'SNOOZED'].includes(
            schedules.get(a.scheduleId)?.status,
          ) &&
          Date.parse(a.scheduledAt) > now,
      )
      .sort(
        (a, b) =>
          Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) ||
          a.alarmId.localeCompare(b.alarmId),
      );
    const triggers = await notifee.getTriggerNotificationIds();
    const owned = new Set(alarms.map(a => a.notificationId));
    const otherCount = triggers.filter(id => !owned.has(id)).length;
    const cap = Math.max(
      0,
      Math.min(
        Math.floor(limit),
        (Platform.OS === 'android' ? 50 : 60) - otherCount,
      ),
    );
    const window = eligible.slice(0, cap),
      wanted = new Set(window.map(a => a.notificationId));
    for (const a of alarms) {
      if (
        !['SCHEDULED', 'SNOOZED'].includes(
          schedules.get(a.scheduleId)?.status,
        ) ||
        a.status === 'CANCELLED' ||
        (triggers.includes(a.notificationId) &&
          !wanted.has(a.notificationId)) ||
        Date.parse(a.scheduledAt) < now - 30 * 60000
      )
        await this.cancel(a.notificationId);
    }
    const settings = await notifee.getNotificationSettings();
    if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED)
      return { scheduled: 0, reason: 'notifications-disabled' };
    if (
      Platform.OS === 'android' &&
      Number(Platform.Version) >= 31 &&
      settings.android?.alarm === AndroidNotificationSetting.DISABLED
    )
      return { scheduled: 0, reason: 'exact-alarms-disabled' };
    for (const a of window)
      await notifee.createTriggerNotification(this.notification(a), {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.parse(a.scheduledAt),
        ...(Platform.OS === 'android'
          ? { alarmManager: { allowWhileIdle: true } }
          : {}),
      });
    await this.store.pruneAlarms(now - 30 * 86400000);
    return {
      scheduled: window.length,
      pending: eligible.length - window.length,
    };
  }
  async scheduleAlarmForDose(schedule) {
    await service().init();
    const result = await service().engine.upsertAlarmForSchedule(schedule);
    await this.rescheduleUpcomingAlarms();
    return result.alarm;
  }
  async cancelAlarm(id) {
    for (const a of await this.store.listAlarms())
      if ([a.alarmId, a.notificationId, a.scheduleId].includes(id)) {
        await this.store.saveAlarm({
          ...a,
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
        });
        await this.cancel(a.notificationId);
      }
  }
  async cancelAllAlarms() {
    for (const a of await this.store.listAlarms())
      await this.cancelAlarm(a.alarmId);
  }
  handleNotificationAction(action, data) {
    const result = this.actionQueue.then(() =>
      this.performNotificationAction(action, data),
    );
    this.actionQueue = result.catch(() => {});
    return result;
  }
  async performNotificationAction(action, data) {
    if (!data?.scheduleId) return;
    await service().init();
    const s = await this.store.getSchedule(data.scheduleId),
      a = await this.store.getAlarm(data.alarmId);
    if (
      !s ||
      !a ||
      ['TAKEN', 'SKIPPED', 'CANCELLED'].includes(s.status) ||
      a.status === 'CANCELLED' ||
      (data.scheduledAt && a.scheduledAt !== data.scheduledAt)
    )
      return;
    if (action === 'take') return service().markTaken(s.id);
    if (action === 'skip')
      return service().markSkipped(s.id, 'Skipped from reminder');
    if (/^snooze_(5|10|15|30)$/.test(action))
      return service().snooze(s.id, Number(action.split('_')[1]));
    if (
      action === 'default' &&
      Platform.OS === 'android' &&
      NativeModules.MedicationAlarmNative
    )
      return;
    if (action === 'default' || action === 'snooze') {
      // Opening the dose screen silences ringing without cancelling the dose.
      await notifee.cancelDisplayedNotification(a.notificationId);
      await AsyncStorage.setItem(
        PENDING,
        JSON.stringify({ ...data, chooseSnooze: action === 'snooze' }),
      );
      await this.flushPendingNavigation();
    }
  }
  async handleEvent({ type, detail }) {
    const data = detail.notification?.data;
    if (data?.type !== 'medication') return;
    if (type === EventType.PRESS || type === EventType.ACTION_PRESS)
      await this.handleNotificationAction(
        detail.pressAction?.id || 'default',
        data,
      );
    if (type === EventType.DELIVERED) {
      const a = await this.store.getAlarm(data.alarmId);
      if (a?.status === 'SCHEDULED' && a.scheduledAt === data.scheduledAt) {
        await this.store.saveAlarm({ ...a, status: 'FIRED' });
        if (AppState.currentState === 'active' && !this.lockScreenAlarmActive) {
          const { notificationManager } = require('./NotificationManager');
          await notificationManager.showMedicationReminder({
            scheduleId: a.scheduleId,
            doseId: a.scheduleId,
            alarmId: a.alarmId,
            medicineId: a.medicineId,
            medicineName: a.medicineName,
            dosage: a.dosage,
            scheduledTime: a.scheduledTime,
            scheduledAt: a.scheduledAt,
            foodInstruction: a.timingInstruction,
          });
        }
      }
      await this.rescheduleUpcomingAlarms();
    }
  }
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }
  async flushPendingNavigation() {
    if (!this.navigationRef?.isReady() || AppState.currentState !== 'active')
      return;
    if (this.opening || this.navigationRef.getCurrentRoute()?.name === 'Splash')
      return;
    const raw = await AsyncStorage.getItem(PENDING);
    if (!raw) return;
    this.opening = true;
    try {
      const data = JSON.parse(raw),
        s = await this.store.getSchedule(data.scheduleId);
      if (s && ['SCHEDULED', 'SNOOZED'].includes(s.status))
        this.navigationRef.navigate('MedicationAlarm', {
          ...data,
          doseId: s.id,
          medicationName: s.medicineName,
          dosage: s.dosage,
          scheduledTime: s.snoozedUntil || s.scheduledAt,
          foodInstruction: s.timingInstruction,
        });
      await AsyncStorage.removeItem(PENDING);
    } finally {
      this.opening = false;
    }
  }
  async snoozeAlarm(id, minutes = 5) {
    const a = await this.store.getAlarm(id);
    if (!a) return false;
    await service().snooze(a.scheduleId, minutes);
    return true;
  }
  async displayForegroundNotification(a) {
    await this.ensureChannel();
    return notifee.displayNotification(this.notification(a));
  }
  async scheduleTestAlarm() {
    await this.ensureChannel();
    return notifee.createTriggerNotification(
      {
        id: 'medication-test',
        title: 'SmartCare alarm test',
        body: 'Offline reminder test',
        android: {
          channelId: this.channelId,
          smallIcon: 'ic_medication_notification',
        },
        ios: { sound: 'default' },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 10000,
        ...(Platform.OS === 'android'
          ? { alarmManager: { allowWhileIdle: true } }
          : {}),
      },
    );
  }
  async getNextScheduledAlarm() {
    return (await service().getUpcomingAlarms())[0] || null;
  }
  destroy() {
    this.unsubscribe?.();
    this.subscription?.remove();
    this.initializing = null;
  }
}
export const localAlarmManager = new LocalAlarmManager();
export default localAlarmManager;
