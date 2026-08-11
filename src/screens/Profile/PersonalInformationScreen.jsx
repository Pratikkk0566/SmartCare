import React, {useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Platform, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {
  ArrowBackIcon, PersonIcon, MailIcon, PhoneIcon,
  CalendarIcon, HeartIcon, PinIcon,
  WifiOffIcon, RefreshIcon, EditIcon, LockIcon,
} from '../../assets/icons/Icons';

// ─── Read-only info row ───────────────────────────────────────────────────────
function InfoRow({label, value, icon: Icon}) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <View style={s.infoValueRow}>
        {Icon && <Icon size={15} color={colors.textMuted} />}
        <Text style={s.infoValue} numberOfLines={2}>
          {value && String(value).trim() ? String(value) : '—'}
        </Text>
      </View>
    </View>
  );
}

// ─── Editable field ───────────────────────────────────────────────────────────
function EditField({label, value, onChangeText, placeholder, keyboardType}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType || 'numeric'}
          autoCapitalize="none"
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({title, sub}) {
  return (
    <View style={s.sectionLabelWrap}>
      <Text style={s.sectionLabel}>{title}</Text>
      {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function PersonalInformationScreen({navigation}) {
  const {userProfile, updateProfile, isOnline, profileLastUpdated, refreshAllData} = useApp();

  // Only these two fields are editable
  const [height, setHeight] = useState(String(userProfile.height || ''));
  const [weight, setWeight] = useState(String(userProfile.weight || ''));

  // Format last updated time
  const lastUpdatedText = profileLastUpdated
    ? new Date(profileLastUpdated).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  const handleSave = async () => {
    const h = height.trim();
    const w = weight.trim();
    if (h && (isNaN(Number(h)) || Number(h) <= 0)) {
      Alert.alert('Invalid', 'Please enter a valid height in cm.');
      return;
    }
    if (w && (isNaN(Number(w)) || Number(w) <= 0)) {
      Alert.alert('Invalid', 'Please enter a valid weight in kg.');
      return;
    }
    await updateProfile({height: h, weight: w});
    Alert.alert('Saved', 'Height and weight updated.');
  };

  // Build display name
  const displayName = [userProfile.firstName, userProfile.middleName, userProfile.lastName]
    .filter(Boolean).join(' ') || '—';

  // Avatar initials
  const initials = [
    userProfile.firstName?.[0] || '',
    userProfile.lastName?.[0]  || '',
  ].join('').toUpperCase() || '?';

  const hue = displayName.charCodeAt(0) * 37 % 360;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Personal Information</Text>
        <TouchableOpacity onPress={handleSave} style={s.saveBtn} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* ── Offline/Sync Banner ────────────────────────────────── */}
      {!isOnline ? (
        <View style={s.offlineBanner}>
          <WifiOffIcon size={18} color="#B45309" />
          <View style={s.offlineInfo}>
            <Text style={s.offlineTitle}>No Internet Connection</Text>
            <Text style={s.offlineSub}>
              Last updated: {lastUpdatedText}. Turn on internet to refresh.
            </Text>
          </View>
        </View>
      ) : profileLastUpdated ? (
        <TouchableOpacity style={s.syncBanner} onPress={refreshAllData} activeOpacity={0.85}>
          <RefreshIcon size={18} color={colors.primary} />
          <View style={s.syncInfo}>
            <Text style={s.syncTitle}>Last updated: {lastUpdatedText}</Text>
            <Text style={s.syncSub}>Tap to refresh now</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Avatar ─────────────────────────────────────────────── */}
        <View style={s.avatarSection}>
          <View style={[s.avatar, {backgroundColor: `hsl(${hue},55%,88%)`}]}>
            <Text style={[s.avatarText, {color: `hsl(${hue},45%,30%)`}]}>{initials}</Text>
          </View>
          <Text style={s.avatarName}>{displayName}</Text>
          {userProfile.uhid ? (
            <View style={s.uhidBadge}>
              <Text style={s.uhidText}>UHID: {userProfile.uhid}</Text>
            </View>
          ) : null}
          <Text style={s.avatarSub}>Information sourced from hospital records</Text>
        </View>

        {/* ── Basic Information (read-only) ───────────────────────── */}
        <View style={s.card}>
          <SectionLabel title="Basic Information" sub="Managed by your hospital" />

          <InfoRow label="First Name"   value={userProfile.firstName}  icon={PersonIcon} />
          <Divider />
          {userProfile.middleName ? (
            <>
              <InfoRow label="Middle Name" value={userProfile.middleName} icon={PersonIcon} />
              <Divider />
            </>
          ) : null}
          <InfoRow label="Last Name"    value={userProfile.lastName}   icon={PersonIcon} />
          <Divider />
          <InfoRow label="Date of Birth" value={userProfile.dob}        icon={CalendarIcon} />
          <Divider />
          <InfoRow label="Gender"       value={userProfile.gender} />
          <Divider />
          <InfoRow label="Blood Group"  value={userProfile.bloodGroup} />
        </View>

        {/* ── Contact Details (read-only) ─────────────────────────── */}
        <View style={s.card}>
          <SectionLabel title="Contact Details" sub="Managed by your hospital" />
          <InfoRow label="Mobile Number" value={userProfile.phone}  icon={PhoneIcon} />
          <Divider />
          <InfoRow label="Email Address" value={userProfile.email}  icon={MailIcon} />
        </View>

        {/* ── Address (read-only) ─────────────────────────────────── */}
        <View style={s.card}>
          <SectionLabel title="Address" sub="Managed by your hospital" />
          <InfoRow label="Address" value={userProfile.address} icon={PinIcon} />
          <Divider />
          <InfoRow label="City"    value={userProfile.city} />
          <Divider />
          <InfoRow label="State"   value={userProfile.state} />
        </View>

        {/* ── Hospital ID (read-only) ─────────────────────────────── */}
        {userProfile.uhid ? (
          <View style={s.card}>
            <SectionLabel title="Hospital ID" sub="Your unique health identifier" />
            <InfoRow label="UHID" value={userProfile.uhid} />
          </View>
        ) : null}

        {/* ── Health Metrics (editable) ───────────────────────────── */}
        <View style={s.card}>
          <SectionLabel title="Health Metrics" sub="Only these fields can be edited" />
          <View style={s.editRow}>
            <View style={s.editHalf}>
              <EditField
                label="Height (cm)"
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 175"
              />
            </View>
            <View style={s.editHalf}>
              <EditField
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 72"
              />
            </View>
          </View>
          <View style={s.editNoteRow}>
            <EditIcon size={13} color={colors.textMuted} />
            <Text style={s.editNote}>Height and weight are stored locally on this device.</Text>
          </View>
        </View>

        {/* ── Lock notice ─────────────────────────────────────────── */}
        <View style={s.lockNotice}>
          <LockIcon size={16} color={colors.textMuted} />
          <Text style={s.lockText}>
            All other information is pulled directly from your hospital records and cannot be edited here. Contact your healthcare provider to update it.
          </Text>
        </View>

        {/* ── Save button ─────────────────────────────────────────── */}
        <TouchableOpacity style={s.saveBlock} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.saveBlockText}>Save Height &amp; Weight</Text>
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn:     {padding: 4, marginRight: spacing.sm},
  headerTitle: {flex: 1, fontSize: 17, fontWeight: '700', color: colors.textPrimary},
  saveBtn:     {paddingVertical: 6, paddingHorizontal: spacing.md, backgroundColor: colors.primary, borderRadius: radius.full},
  saveBtnText: {fontSize: 13, fontWeight: '700', color: '#fff'},

  scroll: {padding: spacing.base, paddingBottom: 40},

  // Avatar
  avatarSection: {alignItems: 'center', paddingVertical: spacing.xl, gap: 6},
  avatar:        {width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4},
  avatarText:    {fontSize: 28, fontWeight: '800'},
  avatarName:    {fontSize: 19, fontWeight: '800', color: colors.textPrimary},
  uhidBadge:     {backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '40'},
  uhidText:      {fontSize: 12, fontWeight: '700', color: colors.primary},
  avatarSub:     {fontSize: 12, color: colors.textMuted, marginTop: 2},

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 4,
    ...shadows.sm,
    marginBottom: spacing.sm,
  },

  // Section label
  sectionLabelWrap: {marginBottom: spacing.sm},
  sectionLabel:     {fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.9, textTransform: 'uppercase'},
  sectionSub:       {fontSize: 11, color: colors.textMuted, marginTop: 2},

  // Read-only info row
  infoRow:      {paddingVertical: spacing.sm + 2},
  infoLabel:    {fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4},
  infoValueRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  infoValue:    {fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1},

  divider: {height: 1, backgroundColor: colors.border},

  // Editable field
  editRow:  {flexDirection: 'row', gap: spacing.sm},
  editHalf: {flex: 1},
  fieldWrap:{marginBottom: spacing.md},
  fieldLabel:{fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.xs,
    backgroundColor: colors.surface,
  },
  input: {flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0, fontWeight: '600'},
  editNote:  {fontSize: 11, color: colors.textMuted, marginBottom: spacing.sm},
  editNoteRow: {flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm},

  // Lock notice
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockIcon: {fontSize: 16},
  lockText: {flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18},

  // Offline/Sync banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  offlineIcon:  {fontSize: 18},
  offlineInfo:  {flex: 1},  offlineTitle: {fontSize: 13, fontWeight: '700', color: '#B45309'},
  offlineSub:   {fontSize: 11, color: '#92400E', marginTop: 2},

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '40',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  syncIcon:  {fontSize: 18},
  syncInfo:  {flex: 1},
  syncTitle: {fontSize: 12, fontWeight: '700', color: colors.primary},
  syncSub:   {fontSize: 11, color: colors.primary, marginTop: 2, opacity: 0.8},

  // Save block
  saveBlock:     {backgroundColor: colors.primary, borderRadius: radius.base, paddingVertical: spacing.base + 2, alignItems: 'center', ...shadows.md},
  saveBlockText: {fontSize: 15, fontWeight: '700', color: '#fff'},
});
