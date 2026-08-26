import React, {useState, useEffect} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {AppointmentApi} from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ArrowBackIcon, StarIcon, CalendarIcon, ClockIcon, PinIcon, VideoIcon, PhoneIcon, HospitalBuildingIcon, InfoIcon} from '../../assets/icons/Icons';

const VISIT_META = {
  clinic: {label: 'In-Clinic Visit', Icon: HospitalBuildingIcon, feeKey: 'consultationFee'},
  video:  {label: 'Video Consult',   Icon: VideoIcon,            feeKey: 'videoFee',  savePct: 20},
  audio:  {label: 'Audio Call',      Icon: PhoneIcon,            feeKey: 'audioFee',  savePct: 30},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pick(obj, keys, fallback = '') {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

// Unwrap response from charges API (may be wrapped in many keys)
function unwrapFirst(payload) {
  if (!payload) return null;
  if (!Array.isArray(payload) && typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload[0] || null;
  // Try to find first array-valued property
  for (const k of ['data', 'list', 'result', 'records', 'items', 'details', 'charges']) {
    if (Array.isArray(payload[k]) && payload[k].length > 0) return payload[k][0];
  }
  for (const v of Object.values(payload)) {
    if (Array.isArray(v) && v.length > 0) return v[0];
  }
  // Otherwise return the object itself (if it's a charge details object)
  return payload;
}

export default function BookingConfirmScreen({navigation, route}) {
  const {doctorId, doctorData, date, isoDate, time, slot, visitType = 'clinic', apmslotid: apmslotidParam} = route.params;
  const {practitioners, bookAppointment} = useApp();

  // Try to find doctor from context first, then use passed data as fallback
  let d = practitioners.find(doc => String(doc.id) === String(doctorId));
  if (!d && doctorData) {
    d = doctorData; // Use the passed doctor data as fallback
    console.log('[BookingConfirmScreen] Using passed doctor data:', d.name);
  }

  console.log('[BookingConfirmScreen] Doctor found:', !!d, 'ID:', doctorId);
  if (!d) {
    console.error('[BookingConfirmScreen] No doctor data available!');
    return null; // This will prevent the blank screen and show error
  }
  const vm = VISIT_META[visitType] || VISIT_META.clinic;

  const [fee,           setFee]           = useState(0);
  const [apptTypeData,  setApptTypeData]  = useState(null); // full appointmentTypeDetails response
  const [loadingFee,    setLoadingFee]    = useState(false);
  const [bookingNow,    setBookingNow]    = useState(false);

  // Fetch appointmentTypeDetails
  useEffect(() => {
    if (!d) return;
    async function fetchFee() {
      setLoadingFee(true);
      const patientId = await AsyncStorage.getItem('patientId') || '0';
      const result = await AppointmentApi.getAppointmentCharges(patientId, d.id);
      if (result.success) {
        const raw = unwrapFirst(result.data);
        setApptTypeData(raw || null);
        // Map 10+ possible server field names for the charge
        const serverFee = Number(pick(raw || {}, [
          'charge', 'consultationFee', 'consultation_fee', 'fee',
          'appointmentCharge', 'appointment_charge', 'opd_charges',
          'opdCharge', 'price', 'amount', 'totalCharge', 'visitCharge',
        ], 0));
        if (!isNaN(serverFee) && serverFee > 0) setFee(serverFee);
      }
      setLoadingFee(false);
    }
    fetchFee();
  }, [d]);

  const initials = (d.name || '').replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
  const hue      = (d.name?.charCodeAt(4) || 0) * 37 % 360;

  const handleConfirm = async () => {
    if (bookingNow) return;
    setBookingNow(true);
    const patientId = await AsyncStorage.getItem('patientId') || '0';

    try {
      // Build booking payload matching the exact API structure
      const bookingDate = isoDate || date;

      // Extract slot details
      const rawSlot = slot?._raw || {};
      
      // Get slot ID — MUST use the day-level id (apmslotid) from the availableSlots API response
      // This is the top-level `id` field (e.g. 96448) that authenticates the slot on the server
      // Priority: explicit param > slot._dayId > rawSlot.apmslotid/id/diaryid > nested field fallbacks
      const apmslotid = String(
        apmslotidParam
        || slot?._dayId
        || rawSlot?.apmslotid
        || rawSlot?.id
        || rawSlot?.diaryid
        || pick({...rawSlot, slotObj: slot, ...slot}, [
             'apmslotid', 'apmslotId', 'slotId', 'slot_id', 'slotid',
             'apmtSlotId', 'timeSlotId', 'timeslotid', 'id', 'slotNo',
             'slotNumber', 'slotObj.slotId',
           ], '')
      );

      // Get start time
      const starttime = pick({...rawSlot, slotObj: slot}, [
        'starttime', 'start_time', 'time', 'slot', 'from', 'fromtime',
        'from_time', 'appttime', 'aptmttime', 'slotObj.raw24',
      ]) || time || '';

      // Get appointment type
      const apmt_as = pick(apptTypeData || {}, [
        'apmt_as', 'aptmtype', 'apmttype', 'type', 'appointmentType'
      ], 'Walk');

      // Build the exact payload structure
      const payload = {
        apmslotid,
        apmt_as,
        charge: fee,
        clientId: Number(patientId),
        commencing: bookingDate,
        diaryuser: d.name,
        diaryuserid: Number(d.id),
        starttime,
      };

      console.log('Booking payload:', JSON.stringify(payload, null, 2));

      const result = await AppointmentApi.book(patientId, payload);

      if (!result.success) {
        Alert.alert(
          'Booking Failed',
          (result.message || result.error || 'Server returned an error. Please try again.')
            + (result.details ? `\n\n${result.details}` : ''),
          [{text: 'OK'}],
        );
        return;
      }

      // Booking succeeded — extract the response
      const resData = unwrapFirst(result.data) || result.data || {};
      const serverApptId = String(pick(resData, [
        'appointmentId', 'appointment_id', 'apmtid', 'aptmtid', 'id',
        'appointmentid', 'diaryid', 'bookingId',
      ]) || Date.now().toString());

      const isoDateFinal = pick(resData, ['date', 'appointmentDate', 'commencing']) || bookingDate;
      const dateFinal    = typeof isoDateFinal === 'string' && isoDateFinal.includes('T')
                             ? isoDateFinal.split('T')[0]
                             : (isoDateFinal || date);
      const timeFinal    = pick(resData, ['starttime', 'time']) || starttime || time;
      const statusFinal  = pick(resData, ['status', 'appointmentStatus'], 'Upcoming') || 'Upcoming';

      bookAppointment({
        id:         serverApptId,
        type:       `${d.specialty} Consultation`,
        date:       dateFinal,
        time:       timeFinal,
        location:   visitType === 'clinic' ? (d.clinic || 'In-Clinic') : 'Online consultation',
        doctor:     d.name,
        specialty:  d.specialty,
        visitType:  vm.label,
        status:     statusFinal,
        fee,
      });

      navigation.replace('AppointmentSuccess', {
        doctorId,
        doctorData: d,
        date: dateFinal,
        time: timeFinal,
        visitType,
        fee,
        appointmentId: serverApptId,
      });
    } catch (err) {
      console.error('Booking error:', err);
      Alert.alert(
        'Booking Failed',
        err?.message || 'Something went wrong while booking. Please try again.',
        [{text: 'OK'}],
      );
    } finally {
      setBookingNow(false);
    }
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
          <DetailRow icon={CalendarIcon} label="Date"       value={date} />
          <Divider />
          <DetailRow icon={ClockIcon}    label="Time"       value={time} />
          <Divider />
          <DetailRow icon={vm.Icon}      label="Visit Type" value={vm.label} tag={vm.savePct ? `${vm.savePct}% off` : null} />
          <Divider />
          <DetailRow icon={PinIcon}      label="Location"   value={visitType === 'clinic' ? d.clinic : 'Online consultation'} />
        </View>

        {/* ── Price breakdown ── */}
        <SectionLabel>Consultation Charge</SectionLabel>
        <View style={s.priceCard}>
          {loadingFee ? (
            <ActivityIndicator size="small" color={colors.primary} style={{paddingVertical: 12}} />
          ) : (
            <>
              <PriceRow label="Consultation Fee" value={`₹${fee}`} bold />
              <View style={s.infoNote}>
                <InfoIcon size={14} color={colors.textMuted} />
                <Text style={s.infoText}>Payment to be made at the clinic</Text>
              </View>
            </>
          )}
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <Text style={s.footerLabel}>Payable at Clinic</Text>
          <Text style={s.footerAmt}>₹{fee}</Text>
        </View>
        <TouchableOpacity
          style={[s.confirmBtn, bookingNow && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={bookingNow}
          activeOpacity={0.88}>
          {bookingNow ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={s.confirmBtnText}>Booking…</Text>
            </View>
          ) : (
            <Text style={s.confirmBtnText}>Confirm Booking</Text>
          )}
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

function DetailRow({icon: Icon, label, value, tag}) {
  return (
    <View style={dr.row}>
      <View style={dr.iconWrap}>
        <Icon size={17} color={colors.textSecondary} />
      </View>
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
  iconWrap: {width: 26, alignItems: 'center'},
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
  infoNote:    {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border},
  infoText:    {fontSize: 12, color: colors.textMuted, flex: 1},

  // Footer
  footer:           {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.base, paddingBottom: spacing['2xl'], borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.base},
  footerLeft:       {flex: 1},
  footerLabel:      {fontSize: 11, color: colors.textMuted},
  footerAmt:        {fontSize: 22, fontWeight: '900', color: colors.primary},
  confirmBtn:       {backgroundColor: colors.primary, flex: 2, paddingVertical: spacing.base, borderRadius: radius.full, alignItems: 'center'},
  confirmBtnDisabled:{backgroundColor: '#C4B5FD'},
  confirmBtnText:   {color: '#fff', fontSize: 15, fontWeight: '800'},
});
