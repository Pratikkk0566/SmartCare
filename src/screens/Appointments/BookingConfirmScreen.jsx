import React, {useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {doctors} from '../../data/mockData';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, StarIcon} from '../../assets/icons/Icons';

const VISIT_META = {
  clinic: {label: 'In-Clinic Visit', emoji: '🏥', feeKey: 'consultationFee'},
  video:  {label: 'Video Consult',   emoji: '📹', feeKey: 'videoFee',  savePct: 20},
  audio:  {label: 'Audio Call',      emoji: '📞', feeKey: 'audioFee',  savePct: 30},
};

const PAYMENT_METHODS = [
  {id: 'upi',        emoji: '⚡', label: 'UPI',                 sub: 'Google Pay · PhonePe · Paytm'},
  {id: 'card',       emoji: '💳', label: 'Credit / Debit Card', sub: 'Visa · Mastercard · RuPay'},
  {id: 'netbanking', emoji: '🏦', label: 'Net Banking',         sub: 'All major banks supported'},
  {id: 'cash',       emoji: '💵', label: 'Cash at Clinic',      sub: 'Pay when you arrive'},
];

export default function BookingConfirmScreen({navigation, route}) {
  const {doctorId, date, time, visitType} = route.params;
  const {bookAppointment} = useApp();

  const d   = doctors.find(doc => doc.id === doctorId);
  const vm  = VISIT_META[visitType] || VISIT_META.clinic;
  const fee = d?.[vm.feeKey] ?? d?.consultationFee ?? 0;

  const [paymentMethod, setPaymentMethod] = useState(null);

  if (!d) return null;

  const initials = d.name.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
  const hue      = (d.name.charCodeAt(4) * 37) % 360;

  const handleConfirm = () => {
    if (!paymentMethod) return;
    bookAppointment({
      id:        Date.now().toString(),
      type:      `${d.specialty} Consultation`,
      date,
      time,
      location:  visitType === 'clinic' ? d.clinic : 'Online',
      doctor:    d.name,
      specialty: d.specialty,
      visitType: vm.label,
      status:    'Upcoming',
      fee,
    });
    navigation.replace('AppointmentSuccess', {
      doctorId,
      date,
      time,
      visitType,
      fee,
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} hitSlop={8}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confirm Booking</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Doctor card ── */}
        <SectionLabel>Doctor</SectionLabel>
        <View style={s.docCard}>
          <View style={[s.docAvatar, {backgroundColor: `hsl(${hue},55%,88%)`}]}>
            <Text style={[s.docAvatarText, {color: `hsl(${hue},45%,30%)`}]}>{initials}</Text>
          </View>
          <View style={s.docInfo}>
            <Text style={s.docName}>{d.name}</Text>
            <Text style={s.docSpec}>{d.specialty} · {d.qualifications}</Text>
            <View style={s.ratingRow}>
              <StarIcon size={12} color="#F59E0B" />
              <Text style={s.ratingText}>{d.rating.toFixed(1)}</Text>
              <Text style={s.reviewsText}>({d.reviewCount.toLocaleString()} reviews)</Text>
            </View>
          </View>
        </View>

        {/* ── Appointment details ── */}
        <SectionLabel>Appointment Details</SectionLabel>
        <View style={s.detailCard}>
          <DetailRow emoji="📅" label="Date"        value={date} />
          <Divider />
          <DetailRow emoji="🕐" label="Time"        value={time} />
          <Divider />
          <DetailRow emoji={vm.emoji} label="Visit Type" value={vm.label} tag={vm.savePct ? `${vm.savePct}% off` : null} />
          <Divider />
          <DetailRow emoji="📍" label="Location"   value={visitType === 'clinic' ? d.clinic : 'Online consultation'} />
        </View>

        {/* ── Price breakdown ── */}
        <SectionLabel>Price Breakdown</SectionLabel>
        <View style={s.priceCard}>
          <PriceRow label="Consultation Fee" value={`₹${d.consultationFee}`} />
          {vm.savePct && (
            <PriceRow
              label={`${vm.label} Discount (${vm.savePct}%)`}
              value={`– ₹${d.consultationFee - fee}`}
              green
            />
          )}
          <View style={s.priceDivider} />
          <PriceRow label="Total Payable" value={`₹${fee}`} bold />
        </View>

        {/* ── Payment method ── */}
        <SectionLabel>Payment Method</SectionLabel>
        {PAYMENT_METHODS.map(pm => {
          const active = paymentMethod === pm.id;
          return (
            <TouchableOpacity
              key={pm.id}
              style={[s.payCard, active && s.payCardActive]}
              onPress={() => setPaymentMethod(pm.id)}
              activeOpacity={0.85}>
              <Text style={s.payEmoji}>{pm.emoji}</Text>
              <View style={s.payInfo}>
                <Text style={[s.payLabel, active && {color: colors.primary}]}>{pm.label}</Text>
                <Text style={s.paySub}>{pm.sub}</Text>
              </View>
              <View style={[s.radio, active && s.radioActive]}>
                {active && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          🔒  Payments are secured and encrypted. Your details are never stored.
        </Text>

        <View style={{height: 100}} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <Text style={s.footerLabel}>Total</Text>
          <Text style={s.footerAmt}>₹{fee}</Text>
        </View>
        <TouchableOpacity
          style={[s.confirmBtn, !paymentMethod && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!paymentMethod}
          activeOpacity={0.88}>
          <Text style={s.confirmBtnText}>Confirm & Pay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({children}) {
  return <Text style={sl.text}>{children}</Text>;
}
const sl = StyleSheet.create({
  text: {fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: spacing.lg, marginBottom: spacing.sm},
});

function DetailRow({emoji, label, value, tag}) {
  return (
    <View style={dr.row}>
      <Text style={dr.emoji}>{emoji}</Text>
      <Text style={dr.label}>{label}</Text>
      <View style={dr.right}>
        {tag && (
          <View style={dr.tagBadge}>
            <Text style={dr.tagText}>{tag}</Text>
          </View>
        )}
        <Text style={dr.value}>{value}</Text>
      </View>
    </View>
  );
}
const dr = StyleSheet.create({
  row:      {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, gap: spacing.sm},
  emoji:    {fontSize: 17, width: 26},
  label:    {flex: 1, fontSize: 13, color: colors.textSecondary},
  right:    {flexDirection: 'row', alignItems: 'center', gap: 6},
  tagBadge: {backgroundColor: colors.successLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full},
  tagText:  {fontSize: 10, fontWeight: '700', color: colors.success},
  value:    {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
});

function Divider() {
  return <View style={{height: 1, backgroundColor: colors.border}} />;
}

function PriceRow({label, value, green, bold}) {
  return (
    <View style={pr.row}>
      <Text style={[pr.label, bold && pr.bold]}>{label}</Text>
      <Text style={[pr.value, green && {color: colors.success}, bold && {color: colors.primary, fontSize: 17}]}>{value}</Text>
    </View>
  );
}
const pr = StyleSheet.create({
  row:   {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7},
  label: {fontSize: 13, color: colors.textSecondary},
  value: {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  bold:  {fontWeight: '800', color: colors.textPrimary, fontSize: 14},
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   {flex: 1, backgroundColor: colors.background},

  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingTop: spacing['4xl'], paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  back:   {padding: 4},
  headerTitle: {fontSize: 18, fontWeight: '800', color: colors.textPrimary},

  scroll: {padding: spacing.base},

  // Doctor card
  docCard:      {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm, gap: spacing.md, alignItems: 'center'},
  docAvatar:    {width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center'},
  docAvatarText:{fontSize: 18, fontWeight: '900'},
  docInfo:      {flex: 1, gap: 3},
  docName:      {fontSize: 15, fontWeight: '800', color: colors.textPrimary},
  docSpec:      {fontSize: 11, color: colors.textSecondary},
  ratingRow:    {flexDirection: 'row', alignItems: 'center', gap: 4},
  ratingText:   {fontSize: 12, fontWeight: '700', color: colors.textPrimary},
  reviewsText:  {fontSize: 11, color: colors.textMuted},

  // Detail card
  detailCard:  {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm},

  // Price card
  priceCard:   {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm},
  priceDivider:{height: 1, backgroundColor: colors.border, marginVertical: spacing.sm},

  // Payment
  payCard:      {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.sm, ...shadows.sm, borderWidth: 2, borderColor: 'transparent', gap: spacing.md},
  payCardActive:{borderColor: colors.primary},
  payEmoji:     {fontSize: 26},
  payInfo:      {flex: 1},
  payLabel:     {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  paySub:       {fontSize: 11, color: colors.textMuted, marginTop: 2},
  radio:        {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  radioActive:  {borderColor: colors.primary},
  radioDot:     {width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary},

  disclaimer:  {fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18},

  // Footer
  footer:           {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.base, paddingBottom: spacing['2xl'], borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.base},
  footerLeft:       {flex: 1},
  footerLabel:      {fontSize: 11, color: colors.textMuted},
  footerAmt:        {fontSize: 22, fontWeight: '900', color: colors.primary},
  confirmBtn:       {backgroundColor: colors.primary, flex: 2, paddingVertical: spacing.base, borderRadius: radius.full, alignItems: 'center'},
  confirmBtnDisabled:{backgroundColor: '#C4B5FD'},
  confirmBtnText:   {color: '#fff', fontSize: 15, fontWeight: '800'},
});
