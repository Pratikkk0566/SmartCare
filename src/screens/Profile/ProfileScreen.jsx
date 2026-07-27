import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {useApp} from '../../context/AppContext';
import {InvoiceApi, InvestigationApi} from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SettingsGearIcon, CameraIcon, CalendarIcon, DocumentIcon,
  PillIcon, HeartIcon, PersonIcon, ArrowRightIcon,
  LockIcon, ShieldIcon, InvoiceIcon, ArrowBackIcon,
} from '../../assets/icons/Icons';

const FROM_DATE = '2000-01-01';
function getToDate() { return new Date().toISOString().split('T')[0]; }

// ─── Reusable row inside a menu card ────────────────────────────────────────
function MenuRow({Icon, iconColor, iconBg, label, sub, onPress, last}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !last && styles.menuRowBorder]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, {backgroundColor: iconBg}]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <ArrowRightIcon size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({title, children}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

// Try many possible keys on an object — robust field extraction
function pick(obj, keys, fallback = '') {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

// Count items inside any wrapped API response shape
function unwrapCount(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== 'object') return 0;
  for (const key of ['data', 'list', 'result', 'records', 'reports',
                     'invoices', 'bills', 'items', 'appointments', 'history']) {
    if (Array.isArray(payload[key])) return payload[key].length;
  }
  for (const v of Object.values(payload)) {
    if (Array.isArray(v)) return v.length;
  }
  return 0;
}

export default function ProfileScreen({navigation}) {
  const {userProfile, appointments, appointmentHistory, medicines} = useApp();

  const initials = `${userProfile.firstName?.[0] ?? ''}${userProfile.lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim() || 'Your Name';

  const [reportCount, setReportCount] = useState(null);
  const [invoiceCount, setInvoiceCount] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadCounts = useCallback(async () => {
    setStatsLoading(true);
    try {
      const patientId = await AsyncStorage.getItem('patientId');
      if (patientId) {
        const [invRes, repRes] = await Promise.all([
          InvoiceApi.getAll(patientId, FROM_DATE, getToDate()),
          InvestigationApi.getAll(patientId, FROM_DATE, getToDate()),
        ]);
        if (invRes.success) setInvoiceCount(unwrapCount(invRes.data));
        if (repRes.success) setReportCount(unwrapCount(repRes.data));
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useFocusEffect(useCallback(() => { loadCounts(); }, [loadCounts]));

  const handleAvatarPress = () => {
    Alert.alert('Change Avatar', 'Avatar selection coming soon!');
  };

  const totalAppointments = appointments.length + appointmentHistory.length;

  const stats = [
    {num: String(totalAppointments), label: 'Appointments', Icon: CalendarIcon, color: colors.primary,  bg: colors.primaryLight,
     onPress: () => navigation.navigate('Appointments')},
    {num: reportCount === null ? '…' : String(reportCount), label: 'Records',      Icon: DocumentIcon,  color: colors.success,  bg: colors.successLight,
     onPress: () => navigation.navigate('Investigations')},
    {num: String(medicines.length), label: 'Prescriptions',Icon: PillIcon,      color: colors.warning,  bg: colors.warningLight,
     onPress: () => navigation.navigate('Prescriptions')},
    {num: invoiceCount === null ? '…' : String(invoiceCount), label: 'Invoices',     Icon: InvoiceIcon,   color: '#8B5CF6',       bg: '#F5F3FF',
     onPress: () => navigation.navigate('Invoices')},
  ];

  const vitals = [
    {emoji: '⚖️', val: `${userProfile.weight ?? '--'} ${userProfile.weightUnit ?? 'kg'}`, label: 'Weight'},
    {emoji: '📏', val: `${userProfile.height ?? '--'} ${userProfile.heightUnit ?? 'cm'}`, label: 'Height'},
    {emoji: '🩸', val: userProfile.bloodGroup ?? '--',                                     label: 'Blood'},
    {emoji: '❤️', val: userProfile.bp ?? '--',                                              label: 'BP'},
  ];


  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <LinearGradient
          colors={['#6C63FF', '#8B83FF', '#a89dff']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.hero}>

          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}>
              <ArrowBackIcon size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.heroTopTitle}>My Profile</Text>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.75}>
              <SettingsGearIcon size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleAvatarPress}
            activeOpacity={0.85}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials || '?'}</Text>
            </View>
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              <CameraIcon size={13} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Name + email */}
          <Text style={styles.heroName}>{fullName}</Text>
          {userProfile.email ? (
            <Text style={styles.heroEmail}>{userProfile.email}</Text>
          ) : null}

          {/* Blood group pill */}
          {userProfile.bloodGroup ? (
            <View style={styles.bloodPill}>
              <Text style={styles.bloodPillText}>🩸  {userProfile.bloodGroup}</Text>
            </View>
          ) : null}

          {/* Bottom curve spacer */}
          <View style={styles.heroCurve} />
        </LinearGradient>

        {/* ── STATS STRIP ───────────────────────────────────── */}
        <View style={styles.statsCard}>
          {stats.map(({num, label, Icon, color, bg, onPress}, i) => (
            <React.Fragment key={label}>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.7}
                onPress={onPress}
                disabled={!onPress}>
                <View style={[styles.statIcon, {backgroundColor: bg}]}>
                  <Icon size={16} color={color} />
                </View>
                <Text style={styles.statNum}>{statsLoading && (label === 'Records' || label === 'Invoices') ? '…' : num}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </TouchableOpacity>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── UPCOMING APPOINTMENTS PREVIEW ─────────────────── */}
        {appointments.length > 0 && (
          <View style={styles.upcomingWrap}>
            <View style={styles.upcomingHeader}>
              <Text style={styles.upcomingTitle}>Upcoming Appointments</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Appointments')}
                activeOpacity={0.7}
                hitSlop={8}>
                <Text style={styles.upcomingSeeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {appointments.slice(0, 3).map(a => (
              <TouchableOpacity
                key={a.id}
                style={styles.apptCard}
                onPress={() => navigation.navigate('Appointments')}
                activeOpacity={0.8}>
                <View style={[styles.apptDot, {backgroundColor: colors.primary}]} />
                <View style={styles.apptInfo}>
                  <Text style={styles.apptDoctor} numberOfLines={1}>
                    {a.doctor || a.type || 'Appointment'}
                  </Text>
                  <Text style={styles.apptMeta} numberOfLines={1}>
                    {[a.specialty, a.visitType, a.location].filter(Boolean).slice(0, 2).join(' · ')}
                  </Text>
                </View>
                <View style={styles.apptDateTime}>
                  <Text style={styles.apptDate}>{a.date || '—'}</Text>
                  {a.time ? <Text style={styles.apptTime}>{a.time}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── VITALS ROW ────────────────────────────────────── */}
        <View style={styles.vitalsCard}>
          <Text style={styles.vitalsTitle}>Health Summary</Text>
          <View style={styles.vitalsRow}>
            {vitals.map(({emoji, val, label}) => (
              <View key={label} style={styles.vitalItem}>
                <Text style={styles.vitalEmoji}>{emoji}</Text>
                <Text style={styles.vitalVal}>{val}</Text>
                <Text style={styles.vitalLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── MENU SECTIONS ─────────────────────────────────── */}
        <Section title="Account">
          <MenuRow
            Icon={PersonIcon}
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            label="Personal Information"
            sub="Name, phone, date of birth"
            onPress={() => navigation.navigate('PersonalInformation')}
          />
          <MenuRow
            Icon={DocumentIcon}
            iconColor={colors.success}
            iconBg={colors.successLight}
            label="Medical History"
            sub="Past conditions & diagnoses"
            onPress={() => Alert.alert('Coming Soon', 'Medical history will be available soon.')}
          />
          <MenuRow
            Icon={HeartIcon}
            iconColor={colors.error}
            iconBg={'#FEE2E2'}
            label="Allergies"
            sub={userProfile.allergies?.length ? userProfile.allergies.join(', ') : 'None recorded'}
            onPress={() => Alert.alert('Allergies', userProfile.allergies?.join(', ') || 'No allergies recorded.')}
            last
          />
        </Section>

        <Section title="Health & Records">
          <MenuRow
            Icon={PillIcon}
            iconColor={colors.warning}
            iconBg={colors.warningLight}
            label="Prescriptions"
            sub="View active prescriptions"
            onPress={() => navigation.navigate('Prescriptions')}
          />
          <MenuRow
            Icon={InvoiceIcon}
            iconColor={'#8B5CF6'}
            iconBg={'#F5F3FF'}
            label="Invoices & Bills"
            sub="Payment history"
            onPress={() => navigation.navigate('Invoices')}
            last
          />
        </Section>

        <Section title="Security">
          <MenuRow
            Icon={LockIcon}
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            label="App Lock"
            sub="PIN or biometric protection"
            onPress={() => navigation.navigate('AppLockSetup')}
          />
          <MenuRow
            Icon={ShieldIcon}
            iconColor={colors.success}
            iconBg={colors.successLight}
            label="Insurance Information"
            sub="Manage your insurance details"
            onPress={() => Alert.alert('Coming Soon', 'Insurance info will be available soon.')}
            last
          />
        </Section>

        <Text style={styles.version}>SmartCare PHR · v0.0.1</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const HERO_HEIGHT = 300;

const styles = StyleSheet.create({
  safe:   {flex: 1, backgroundColor: '#F4F4FB'},
  scroll: {paddingBottom: 48},

  // ── Hero ──────────────────────────────────────────────
  hero: {
    height: HERO_HEIGHT,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingHorizontal: spacing.base,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.lg,
  },
 heroIconBtn: {
  width: 36, height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.95)',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 1},
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
},
  heroTopTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },

  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroName:  {fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.2},
  heroEmail: {fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3},

  bloodPill: {
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bloodPillText: {fontSize: 12, fontWeight: '600', color: '#fff'},

  heroCurve: {height: spacing.xl},

  // ── Stats card ────────────────────────────────────────
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.base,
    marginTop: -28,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    shadowColor: '#6C63FF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  statItem: {flex: 1, alignItems: 'center', gap: 4},
  statIcon: {
    width: 32, height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNum:   {fontSize: 16, fontWeight: '800', color: colors.textPrimary},
  statLabel: {fontSize: 10, color: colors.textMuted, textAlign: 'center'},
  statDivider: {width: 1, height: 36, backgroundColor: colors.border},

  // ── Upcoming Appointments preview ─────────────────────
  upcomingWrap: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  upcomingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  upcomingSeeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  apptDot: {
    width: 8, height: 8, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start',
  },
  apptInfo: {flex: 1},
  apptDoctor: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  apptMeta:   {fontSize: 11, color: colors.textMuted, marginTop: 2},
  apptDateTime: {alignItems: 'flex-end'},
  apptDate:   {fontSize: 12, fontWeight: '700', color: colors.primary},
  apptTime:   {fontSize: 11, color: colors.textSecondary, marginTop: 2},

  // ── Vitals ────────────────────────────────────────────
  vitalsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  vitalsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  vitalsRow:  {flexDirection: 'row', justifyContent: 'space-around'},
  vitalItem:  {alignItems: 'center', gap: 4},
  vitalEmoji: {fontSize: 22},
  vitalVal:   {fontSize: 15, fontWeight: '800', color: colors.textPrimary},
  vitalLabel: {fontSize: 11, color: colors.textMuted},

  // ── Sections ──────────────────────────────────────────
  section:      {marginTop: spacing.base, marginHorizontal: spacing.base},
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Menu rows ─────────────────────────────────────────
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width: 38, height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText:  {flex: 1},
  menuLabel: {fontSize: 14, fontWeight: '600', color: colors.textPrimary},
  menuSub:   {fontSize: 12, color: colors.textMuted, marginTop: 2},

  // ── Logout ────────────────────────────────────────────
  logoutBtn: {
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    paddingVertical: 15,
    borderRadius: radius.xl,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  logoutText: {fontSize: 15, fontWeight: '700', color: colors.error},

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.base,
  },

  // Logout modal
modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},
modalSheet: {
  backgroundColor: colors.surface,
  borderTopLeftRadius: radius['2xl'],
  borderTopRightRadius: radius['2xl'],
  paddingHorizontal: spacing.xl,
  paddingTop: spacing.md,
  paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  alignItems: 'center',
},
modalHandle: {
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: colors.border,
  marginBottom: spacing.xl,
},
modalIconWrap: {
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: '#FEE2E2',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: spacing.base,
},
modalIconEmoji: {
  fontSize: 34,
},
modalTitle: {
  fontSize: 22,
  fontWeight: '800',
  color: colors.textPrimary,
  marginBottom: spacing.xs,
},
modalSub: {
  fontSize: 14,
  color: colors.textSecondary,
  textAlign: 'center',
  lineHeight: 21,
  marginBottom: spacing.xl,
},
modalLogoutBtn: {
  width: '100%',
  paddingVertical: 15,
  borderRadius: radius.xl,
  backgroundColor: colors.error,
  alignItems: 'center',
  marginBottom: spacing.sm,
},
modalLogoutText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#fff',
},
modalCancelBtn: {
  width: '100%',
  paddingVertical: 15,
  borderRadius: radius.xl,
  backgroundColor: '#F3F4F6',
  alignItems: 'center',
},
modalCancelText: {
  fontSize: 16,
  fontWeight: '600',
  color: colors.textSecondary,
},
});