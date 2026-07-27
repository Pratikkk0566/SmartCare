import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, StarIcon} from '../../assets/icons/Icons';

const {width: SW} = Dimensions.get('window');

// Local specialties for colour/emoji lookup
const SPECIALTIES = [
  {name: 'General Physician', emoji: '🩺', color: '#6C63FF', bgColor: '#EEE9FF'},
  {name: 'Cardiologist',      emoji: '❤️', color: '#EF4444', bgColor: '#FEE2E2'},
  {name: 'Dentist',           emoji: '🦷', color: '#3B82F6', bgColor: '#DBEAFE'},
  {name: 'Dermatologist',     emoji: '🧴', color: '#22C55E', bgColor: '#DCFCE7'},
  {name: 'Pediatrician',      emoji: '👶', color: '#F59E0B', bgColor: '#FEF3C7'},
  {name: 'Orthopedic',        emoji: '🦴', color: '#8B5CF6', bgColor: '#F5F3FF'},
  {name: 'Neurologist',       emoji: '🧠', color: '#EC4899', bgColor: '#FCE7F3'},
  {name: 'ENT Specialist',    emoji: '👂', color: '#14B8A6', bgColor: '#CCFBF1'},
];

export default function DoctorProfileScreen({navigation, route}) {
  const {doctorId} = route.params;
  const {practitioners} = useApp();
  const d = practitioners.find(doc => String(doc.id) === String(doctorId));

  if (!d) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.errorWrap}>
          <Text style={s.errorText}>Doctor not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{color: colors.primary, fontWeight: '700'}}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initials  = d.name.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
  const hue       = (d.name.charCodeAt(4) * 37) % 360;
  const avatarBg  = `hsl(${hue},55%,88%)`;
  const avatarFg  = `hsl(${hue},45%,30%)`;
  const isToday   = d.availability === 'Available Today';
  const spec      = SPECIALTIES.find(sp => sp.name === d.specialty);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero header ── */}
        <View style={[s.hero, {backgroundColor: spec?.bgColor || colors.primaryLight}]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
            <ArrowBackIcon size={22} color={spec?.color || colors.primary} />
          </TouchableOpacity>

          <View style={[s.avatar, {backgroundColor: avatarBg}]}>
            <Text style={[s.avatarText, {color: avatarFg}]}>{initials}</Text>
          </View>

          <Text style={s.heroName}>{d.name}</Text>
          <Text style={[s.heroSpec, {color: spec?.color || colors.primary}]}>
            {spec?.emoji || '🩺'}  {d.specialty}
          </Text>
          <Text style={s.heroQual}>{d.qualifications}</Text>

          {/* Rating badge */}
          <View style={s.ratingBadge}>
            <StarIcon size={14} color="#F59E0B" />
            <Text style={s.ratingVal}>{d.rating.toFixed(1)}</Text>
            <Text style={s.ratingCount}>({d.reviewCount.toLocaleString()} reviews)</Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={s.statsRow}>
          <StatBox value={`${d.experience}+`} label="Years Exp." />
          <View style={s.statDivider} />
          <StatBox value={`${(d.patients / 1000).toFixed(1)}K`} label="Patients" />
          <View style={s.statDivider} />
          <StatBox value={d.reviewCount >= 1000 ? `${(d.reviewCount / 1000).toFixed(1)}K` : d.reviewCount} label="Reviews" />
          <View style={s.statDivider} />
          <StatBox value={d.rating.toFixed(1)} label="Rating" accent />
        </View>

        {/* ── Availability ── */}
        <View style={s.section}>
          <View style={[s.availCard, {backgroundColor: isToday ? colors.successLight : colors.warningLight}]}>
            <Text style={{fontSize: 20}}>{isToday ? '🟢' : '🟡'}</Text>
            <View style={{flex: 1}}>
              <Text style={[s.availTitle, {color: isToday ? colors.success : colors.warning}]}>
                {d.availability}
              </Text>
              <Text style={s.availNext}>Next slot: {d.nextSlot}</Text>
            </View>
          </View>
        </View>

        {/* ── About ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>About Doctor</Text>
          <View style={s.card}>
            <Text style={s.aboutText}>{d.about}</Text>
          </View>
        </View>

        {/* ── Clinic ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Clinic Information</Text>
          <View style={s.card}>
            <View style={s.clinicRow}>
              <Text style={{fontSize: 22}}>🏥</Text>
              <View style={{flex: 1}}>
                <Text style={s.clinicName}>{d.clinic}</Text>
                <Text style={s.clinicAddr}>{d.clinicAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Languages ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Languages Spoken</Text>
          <View style={s.langRow}>
            {d.languages.map(lang => (
              <View key={lang} style={s.langChip}>
                <Text style={s.langText}>{lang}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Consultation fees ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Consultation Fees</Text>
          <View style={s.card}>
            <FeeRow emoji="🏥" label="In-Clinic Visit"   fee={d.consultationFee} />
            <View style={s.feeDivider} />
            <FeeRow emoji="📹" label="Video Consult"     fee={d.videoFee} tag="20% off" />
            <View style={s.feeDivider} />
            <FeeRow emoji="📞" label="Audio Call"        fee={d.audioFee} tag="30% off" />
          </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* ── Book CTA ── */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <Text style={s.footerFeeLabel}>Starting from</Text>
          <Text style={s.footerFee}>₹{Math.min(d.consultationFee, d.videoFee, d.audioFee)}</Text>
        </View>
        <TouchableOpacity
          style={s.bookBtn}
          onPress={() => navigation.navigate('BookingSlot', {doctorId: d.id})}
          activeOpacity={0.88}>
          <Text style={s.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBox({value, label, accent}) {
  return (
    <View style={sb.wrap}>
      <Text style={[sb.val, accent && sb.valAccent]}>{value}</Text>
      <Text style={sb.label}>{label}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:      {flex: 1, alignItems: 'center', paddingVertical: spacing.md},
  val:       {fontSize: 18, fontWeight: '900', color: colors.textPrimary},
  valAccent: {color: colors.primary},
  label:     {fontSize: 11, color: colors.textSecondary, marginTop: 3, textAlign: 'center'},
});

function FeeRow({emoji, label, fee, tag}) {
  return (
    <View style={fr.row}>
      <Text style={fr.emoji}>{emoji}</Text>
      <Text style={fr.label}>{label}</Text>
      {tag && (
        <View style={fr.tagBadge}>
          <Text style={fr.tagText}>{tag}</Text>
        </View>
      )}
      <Text style={fr.fee}>₹{fee}</Text>
    </View>
  );
}
const fr = StyleSheet.create({
  row:      {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm},
  emoji:    {fontSize: 18, width: 28},
  label:    {flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500'},
  tagBadge: {backgroundColor: colors.successLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full},
  tagText:  {fontSize: 10, fontWeight: '700', color: colors.success},
  fee:      {fontSize: 15, fontWeight: '800', color: colors.primary},
});

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:      {flex: 1, backgroundColor: colors.background},
  scroll:    {paddingBottom: 0},

  errorWrap: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md},
  errorText: {fontSize: 16, color: colors.textSecondary},

  hero:      {alignItems: 'center', paddingTop: spacing['4xl'], paddingBottom: spacing.xl, paddingHorizontal: spacing.base, position: 'relative'},
  backBtn:   {position: 'absolute', top: spacing['4xl'], left: spacing.base, padding: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: radius.full},
  avatar:    {width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 3, borderColor: '#fff'},
  avatarText:{fontSize: 30, fontWeight: '900'},
  heroName:  {fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: 4, textAlign: 'center'},
  heroSpec:  {fontSize: 14, fontWeight: '700', marginBottom: 4, textAlign: 'center'},
  heroQual:  {fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center'},
  ratingBadge:{flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, ...shadows.sm},
  ratingVal: {fontSize: 13, fontWeight: '800', color: colors.textPrimary},
  ratingCount:{fontSize: 12, color: colors.textSecondary},

  statsRow:   {flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: spacing.base, marginTop: spacing.base, borderRadius: radius.lg, ...shadows.sm, alignItems: 'center'},
  statDivider:{width: 1, height: 40, backgroundColor: colors.border},

  section:    {paddingHorizontal: spacing.base, marginTop: spacing.lg},
  sectionTitle:{fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.6},
  card:       {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm},

  availCard:  {flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: radius.lg},
  availTitle: {fontSize: 14, fontWeight: '800'},
  availNext:  {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  aboutText:  {fontSize: 13, color: colors.textSecondary, lineHeight: 21},

  clinicRow:  {flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start'},
  clinicName: {fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 4},
  clinicAddr: {fontSize: 12, color: colors.textSecondary, lineHeight: 18},

  langRow:    {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  langChip:   {backgroundColor: colors.surface, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, ...shadows.sm, borderWidth: 1, borderColor: colors.border},
  langText:   {fontSize: 13, fontWeight: '600', color: colors.textPrimary},

  feeDivider: {height: 1, backgroundColor: colors.border},

  footer:     {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.base, paddingBottom: spacing['2xl'], borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.base},
  footerLeft: {flex: 1},
  footerFeeLabel:{fontSize: 11, color: colors.textMuted},
  footerFee:  {fontSize: 20, fontWeight: '900', color: colors.primary},
  bookBtn:    {backgroundColor: colors.primary, flex: 2, paddingVertical: spacing.base, borderRadius: radius.full, alignItems: 'center'},
  bookBtnText:{color: '#fff', fontSize: 15, fontWeight: '800'},
});
