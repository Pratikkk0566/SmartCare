import React, {useState, useEffect} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {
  ArrowBackIcon, ArrowRightIcon, BellIcon, LockIcon,
  ShieldIcon, PersonIcon, DocumentIcon, SettingsGearIcon,
} from '../../assets/icons/Icons';
import {useApp} from '../../context/AppContext';
import {StorageService} from '../../services/StorageService';

function SectionTitle({title}) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SettingRow({icon: Icon, iconColor = colors.primary, label, sub, onPress, rightElement, danger}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.iconBox, {backgroundColor: danger ? colors.errorLight : colors.primaryLight}]}>
        <Icon size={18} color={danger ? colors.error : iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {rightElement ?? (onPress && <ArrowRightIcon size={15} color={colors.textMuted} />)}
    </TouchableOpacity>
  );
}


function Divider() {
  return <View style={styles.divider} />;
}

export default function SettingsScreen({navigation}) {
const {setIsLoggedIn} = useApp();
const [showLogout, setShowLogout] = useState(false);
const [notifications,      setNotifications]      = useState(true);
const [medicineReminders,  setMedicineReminders]  = useState(true);
const [appointmentAlerts,  setAppointmentAlerts]  = useState(true);
// Add a useEffect right after to load saved values:
useEffect(() => {
  (async () => {
    const n  = await StorageService.get('@setting_notifications');
    const mr = await StorageService.get('@setting_medicineReminders');
    const aa = await StorageService.get('@setting_appointmentAlerts');
    if (n  !== null) setNotifications(n);
    if (mr !== null) setMedicineReminders(mr);
    if (aa !== null) setAppointmentAlerts(aa);
  })();
}, []);
// Add useEffect to save changes:
useEffect(() => { StorageService.set('@setting_notifications',     notifications);     }, [notifications]);
useEffect(() => { StorageService.set('@setting_medicineReminders', medicineReminders); }, [medicineReminders]);
useEffect(() => { StorageService.set('@setting_appointmentAlerts', appointmentAlerts); }, [appointmentAlerts]);

const confirmLogout = async () => {
  setShowLogout(false);
  await StorageService.set('@isLoggedIn', false);
  setIsLoggedIn(false);
  navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
};

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{width: 30}} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Account */}
        <SectionTitle title="Account" />
        <View style={styles.card}>
          <SettingRow
            icon={PersonIcon}
            label="Personal Information"
            sub="Update your name, email and more"
            onPress={() => navigation.navigate('PersonalInformation')}
          />
          <Divider />
          <SettingRow
            icon={LockIcon}
            label="App Lock"
            sub="Biometric or PIN security"
            onPress={() => navigation.navigate('AppLockSetup')}
          />
          <Divider />
          <SettingRow
            icon={SettingsGearIcon}
            label="Language"
            sub="Change your preferred language"
            onPress={() => navigation.navigate('LanguageSelect')}
          />
        </View>

        {/* Notifications */}
        <SectionTitle title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon={BellIcon}
            label="Push Notifications"
            sub="Enable or disable all notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{false: colors.border, true: colors.primary}}
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          <SettingRow
            icon={BellIcon}
            iconColor={colors.warning}
            label="Medicine Reminders"
            sub="Get reminded when to take medicines"
            rightElement={
              <Switch
                value={medicineReminders}
                onValueChange={setMedicineReminders}
                trackColor={{false: colors.border, true: colors.primary}}
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          <SettingRow
            icon={BellIcon}
            iconColor={colors.info}
            label="Appointment Alerts"
            sub="Reminders before your appointments"
            rightElement={
              <Switch
                value={appointmentAlerts}
                onValueChange={setAppointmentAlerts}
                trackColor={{false: colors.border, true: colors.primary}}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Privacy & Legal */}
        <SectionTitle title="Privacy & Legal" />
        <View style={styles.card}>
          <SettingRow
            icon={ShieldIcon}
            label="Privacy Policy"
            sub="How we handle your data"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy coming soon.')}
          />
          <Divider />
          <SettingRow
            icon={DocumentIcon}
            label="Terms of Service"
            sub="Read our terms and conditions"
            onPress={() => Alert.alert('Terms', 'Terms of service coming soon.')}
          />
        </View>

        {/* About */}
        <SectionTitle title="About" />
        <View style={styles.card}>
          <SettingRow
            icon={SettingsGearIcon}
            label="App Version"
            sub="1.0.0"
            rightElement={
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>Latest</Text>
              </View>
            }
          />
        </View>

        {/* Danger Zone */}
        <SectionTitle title="Account Actions" />
        <View style={styles.card}>
          <SettingRow
            icon={LockIcon}
            label="Log Out"
            sub="Sign out of your account"
            onPress={() => setShowLogout(true)}
            danger
          />
        </View>

        <View style={{height: 32}} />
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        visible={showLogout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogout(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowLogout(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconWrap}>
              <ShieldIcon size={36} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Logging out?</Text>
            <Text style={styles.modalSub}>
              You'll need to sign back in to access your health data.
            </Text>
            <TouchableOpacity
              style={styles.modalLogoutBtn}
              onPress={confirmLogout}
              activeOpacity={0.85}>
              <Text style={styles.modalLogoutText}>Yes, log me out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowLogout(false)}
              activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {padding: 4, marginRight: spacing.sm},
  headerTitle: {flex: 1, fontSize: 17, fontWeight: '700', color: colors.textPrimary},
  scroll: {padding: spacing.base, paddingBottom: 40},
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  card: {backgroundColor: colors.surface, borderRadius: radius.base, ...shadows.sm, marginBottom: spacing.sm, overflow: 'hidden'},
  row: {flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md},
  iconBox: {width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  rowInfo: {flex: 1},
  rowLabel: {fontSize: 14, fontWeight: '600', color: colors.textPrimary},
  rowLabelDanger: {color: colors.error},
  rowSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  divider: {height: 1, backgroundColor: colors.border, marginLeft: spacing.base + 38 + spacing.md},
  versionBadge: {backgroundColor: colors.successLight, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3},
  versionBadgeText: {fontSize: 11, fontWeight: '700', color: colors.success},

  // ── Logout modal ───────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  modalIconWrap: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: colors.errorLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base,
  },
  modalIconEmoji: {fontSize: 32},
  modalTitle: {fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm},
  modalSub: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
    marginBottom: spacing.xl,
  },
  modalLogoutBtn: {
    backgroundColor: colors.error,
    borderRadius: radius.md,
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalLogoutText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  modalCancelBtn: {
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: {fontSize: 15, fontWeight: '600', color: colors.textSecondary},
});