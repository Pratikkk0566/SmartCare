import React, {useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform, Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Defs, LinearGradient as SvgLinearGradient, Stop} from 'react-native-svg';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {useApp} from '../../context/AppContext';
import {
  SettingsGearIcon, CameraIcon, CalendarIcon, DocumentIcon,
  PillIcon, HeartIcon, PersonIcon, ArrowRightIcon,
  LockIcon, ShieldIcon, InvoiceIcon, ArrowBackIcon,
  BloodDropIcon, ScaleIcon, RulerIcon, HeartRateIcon,
} from '../../assets/icons/Icons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const HERO_HEIGHT = 300;

// ─── Wave Background Component ────────────────────────────────────────────
// Teal gradient base with soft cyan waves that sweep diagonally across
// the lower half, then a gentle white swoosh that curves up before meeting
// the stats card.
function WaveBackground() {
  const w = SCREEN_WIDTH;
  const h = HERO_HEIGHT;

  return (
    <View style={styles.waveContainer}>
      {/* Teal gradient base — deeper teal at the top fading into brighter cyan */}
      <LinearGradient
        colors={['#0a7d7a', '#0ea5a2', '#14bfbb']}
        locations={[0, 0.55, 1]}
        start={{x: 0.15, y: 0}}
        end={{x: 0.85, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      <Svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Soft cyan gradient used for the two flowing highlight waves */}
          <SvgLinearGradient id="mint" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#5dd4d1" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#a5f3f0" stopOpacity="0.18" />
          </SvgLinearGradient>
          {/* Light wash for the topmost subtle highlight */}
          <SvgLinearGradient id="topGlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.04" />
          </SvgLinearGradient>
        </Defs>

        {/* Faint upper-left highlight sweeping across the top strip */}
        <Path
          d={`M0,${h * 0.02}
              C ${w * 0.28},${h * 0.16} ${w * 0.55},${-h * 0.04} ${w},${h * 0.1}
              L ${w},0 L 0,0 Z`}
          fill="url(#topGlow)"
        />

        {/* First (back) mint wave — positioned lower */}
        <Path
          d={`M0,${h * 0.75}
              C ${w * 0.25},${h * 0.65} ${w * 0.5},${h * 0.85} ${w * 0.75},${h * 0.72}
              C ${w * 0.88},${h * 0.65} ${w * 0.96},${h * 0.7} ${w},${h * 0.68}
              L ${w},${h} L 0,${h} Z`}
          fill="url(#mint)"
        />

        {/* Second (front) mint wave */}
        <Path
          d={`M0,${h * 0.85}
              C ${w * 0.3},${h * 0.75} ${w * 0.6},${h * 0.95} ${w * 0.85},${h * 0.82}
              C ${w * 0.92},${h * 0.78} ${w * 0.98},${h * 0.81} ${w},${h * 0.80}
              L ${w},${h} L 0,${h} Z`}
          fill="#7de3e0"
          opacity={0.30}
        />

        {/* White swoosh curving up into the stats card */}
        <Path
          d={`M0,${h * 0.95}
              C ${w * 0.35},${h * 0.88} ${w * 0.65},${h * 0.99} ${w},${h * 0.93}
              L ${w},${h} L 0,${h} Z`}
          fill="#F3F4F6"
        />
      </Svg>
    </View>
  );
}

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
function Section({title, Icon, iconColor, children}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        {Icon ? <Icon size={13} color={iconColor ?? '#D97706'} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen({navigation}) {
  const {userProfile, appointments, appointmentHistory, medicines, invoices, investigations} = useApp();

  const initials = `${userProfile.firstName?.[0] ?? ''}${userProfile.lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim() || 'Your Name';

  const totalAppointments = appointments.length + appointmentHistory.length;

  const handleAvatarPress = () => {
    Alert.alert('Change Avatar', 'Avatar selection coming soon!');
  };

  const stats = [
    {num: String(totalAppointments),   label: 'Appointments', Icon: CalendarIcon, color: colors.primary, bg: colors.primaryLight,
     onPress: () => navigation.navigate('Appointments')},
    {num: String(investigations.length), label: 'Records',    Icon: DocumentIcon,  color: colors.success, bg: colors.successLight,
     onPress: () => navigation.navigate('Investigations')},
    {num: String(medicines.length),    label: 'Prescriptions',Icon: PillIcon,      color: colors.warning, bg: colors.warningLight,
     onPress: () => navigation.navigate('Prescriptions')},
    {num: String(invoices.length),     label: 'Invoices',     Icon: InvoiceIcon,   color: '#8B5CF6',      bg: '#F5F3FF',
     onPress: () => navigation.navigate('Invoices')},
  ];

  const vitals = [
    {Icon: ScaleIcon,     color: '#8B5CF6', val: `${userProfile.weight ?? '--'} ${userProfile.weightUnit ?? 'kg'}`, label: 'Weight'},
    {Icon: RulerIcon,     color: '#3B82F6', val: `${userProfile.height ?? '--'} ${userProfile.heightUnit ?? 'cm'}`, label: 'Height'},
    {Icon: BloodDropIcon, color: '#EF4444', val: userProfile.bloodGroup ?? '--',                                     label: 'Blood'},
    {Icon: HeartRateIcon, color: '#EF4444', val: userProfile.bp ?? '--',                                             label: 'BP'},
  ];


  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces={true}>

        {/* ── HERO WITH GREEN BACKGROUND ─────────────────────────────────────────── */}
        <View style={styles.hero}>
          <WaveBackground />

          <SafeAreaView edges={['top']} style={styles.heroContent}>
            {/* Top bar */}
            <View style={styles.heroTopBar}>
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.75}>
                <ArrowBackIcon size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.heroTopTitle}>My Profile</Text>
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.75}>
                <SettingsGearIcon size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handleAvatarPress}
              activeOpacity={0.85}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials || 'PP'}</Text>
              </View>
              {/* Camera badge */}
              <View style={styles.cameraBadge}>
                <CameraIcon size={12} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Name */}
            <View style={styles.nameContainer}>
              <Text style={styles.heroName}>{fullName.toUpperCase()}</Text>
            </View>

            {/* UHID */}
            {userProfile.uhid ? (
              <View style={styles.uhidBadge}>
                <Text style={styles.uhidText}>UHID: SCD/{userProfile.uhid}</Text>
              </View>
            ) : (
              <View style={styles.uhidBadge}>
                <Text style={styles.uhidText}>UHID: SCD/250505011</Text>
              </View>
            )}
          </SafeAreaView>
        </View>

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
                  <Icon size={20} color={color} />
                </View>
                <Text style={styles.statNum}>{num}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </TouchableOpacity>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── HEALTH SUMMARY ────────────────────────────────────── */}
        <View style={styles.vitalsCard}>
          <View style={styles.vitalsHeader}>
            <HeartRateIcon size={16} color={colors.success} />
            <Text style={styles.vitalsTitle}>HEALTH SUMMARY</Text>
            <TouchableOpacity onPress={() => Alert.alert('View Details')} activeOpacity={0.7}>
              <Text style={styles.viewDetails}>View details →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.vitalsRow}>
            {vitals.map(({Icon, color, val, label}) => (
              <View key={label} style={styles.vitalItem}>
                <View style={[styles.vitalIconWrap, {backgroundColor: color + '15'}]}>
                  <Icon size={22} color={color} />
                </View>
                <Text style={styles.vitalVal}>{val}</Text>
                <Text style={styles.vitalLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── ACCOUNT SECTION ─────────────────────────────────── */}
        <Section title="ACCOUNT" Icon={SettingsGearIcon} iconColor="#D97706">
          <MenuRow
            Icon={PersonIcon}
            iconColor={colors.success}
            iconBg={'#D1FAE5'}
            label="Personal Information"
            sub="Name, phone, date of birth"
            onPress={() => navigation.navigate('PersonalInformation')}
          />
          <MenuRow
            Icon={DocumentIcon}
            iconColor={'#10B981'}
            iconBg={'#D1FAE5'}
            label="Medical History"
            sub="Past conditions & diagnoses"
            onPress={() => Alert.alert('Coming Soon', 'Medical history will be available soon.')}
          />
          <MenuRow
            Icon={HeartIcon}
            iconColor={'#F59E0B'}
            iconBg={'#FEF3C7'}
            label="Allergies"
            sub={userProfile.allergies?.length ? userProfile.allergies.join(', ') : 'Known allergies'}
            onPress={() => Alert.alert('Allergies', userProfile.allergies?.join(', ') || 'No allergies recorded.')}
          />
          <MenuRow
            Icon={ShieldIcon}
            iconColor={'#3B82F6'}
            iconBg={'#DBEAFE'}
            label="Insurance"
            sub="Your insurance details"
            onPress={() => Alert.alert('Coming Soon', 'Insurance info will be available soon.')}
          />
          <MenuRow
            Icon={LockIcon}
            iconColor={'#059669'}
            iconBg={'#D1FAE5'}
            label="Security"
            sub="Password & privacy"
            onPress={() => navigation.navigate('AppLockSetup')}
            last
          />
        </Section>

        <Text style={styles.version}>SmartCare PHR · v0.0.1</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  scroll: {flexGrow: 1},

  // ── Hero with wavy green background ──────────────────────────────────────────────
  hero: {
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: '#0ea5a2',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  waveContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.lg,
    zIndex: 10,
  },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTopTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.md,
    zIndex: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0ea5a2',
    letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0ea5a2',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nameContainer: {
    zIndex: 10,
    marginBottom: spacing.sm,
  },
  heroName:  {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  uhidBadge: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uhidText:  {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7d7a',
    letterSpacing: 0.4,
  },

  // ── Stats card ────────────────────────────────────────
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
  },
  statItem: {flex: 1, alignItems: 'center', gap: 6},
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNum:   {fontSize: 20, fontWeight: '800', color: '#1F2937', letterSpacing: 0.2},
  statLabel: {fontSize: 10, color: '#6B7280', textAlign: 'center', fontWeight: '500'},
  statDivider: {width: 1, height: 50, backgroundColor: '#E5E7EB'},

  // ── Vitals / Health Summary ────────────────────────────────────
  vitalsCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    marginHorizontal: spacing.base,
    marginTop: spacing['3xl'],
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  vitalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 8,
  },
  vitalsTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  viewDetails: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0ea5a2',
  },
  vitalsRow:  {flexDirection: 'row', justifyContent: 'space-around'},
  vitalItem:      {alignItems: 'center', gap: 8},
  vitalIconWrap:  {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  vitalVal:       {fontSize: 16, fontWeight: '800', color: '#1F2937', letterSpacing: 0.2},
  vitalLabel:     {fontSize: 11, color: '#9CA3AF', fontWeight: '500'},

  // ── Sections ──────────────────────────────────────────
  section:      {marginTop: spacing.lg, marginHorizontal: spacing.base},
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Menu rows ─────────────────────────────────────────
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText:  {flex: 1},
  menuLabel: {fontSize: 15, fontWeight: '700', color: '#1F2937', letterSpacing: 0.1},
  menuSub:   {fontSize: 12, color: '#9CA3AF', marginTop: 3, fontWeight: '500'},

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    fontWeight: '500',
  },
});
