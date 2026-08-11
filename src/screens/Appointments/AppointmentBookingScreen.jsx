import React, {useState, useRef, useEffect, useCallback} from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert, Dimensions, ActivityIndicator,} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppointmentApi} from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {
ArrowBackIcon,
  StethoscopeIcon,
  HeartIcon,
  ToothIcon,
  SkinIcon,
  BoneIcon,
  BrainIcon,
  BabyIcon,
  EarIcon,
  CheckCircleIcon,
  StarIcon,
  CalendarIcon,
  ClockIcon,
  PinIcon,
  PhoneIcon,
  CameraIcon,
  ClipboardIcon,
  HospitalBuildingIcon,
  VideoIcon,
  BoltIcon,
  BankIcon,
  CashIcon,
  WalletIcon,
} from '../../assets/icons/Icons';

const {width: SW} = Dimensions.get('window');

// ─── Local specialties constant (no API endpoint) ─────────────────────────────
const SPECIALTIES = [
  {id: 's1', name: 'General Physician', Icon: StethoscopeIcon, color: '#6C63FF', bgColor: '#EEE9FF', doctorCount: 0, nextAvailable: 'Today'},
  {id: 's2', name: 'Cardiologist',      Icon: HeartIcon,       color: '#EF4444', bgColor: '#FEE2E2', doctorCount: 0, nextAvailable: 'Today'},
  {id: 's3', name: 'Dentist',           Icon: ToothIcon,       color: '#3B82F6', bgColor: '#DBEAFE', doctorCount: 0, nextAvailable: 'Today'},
  {id: 's4', name: 'Dermatologist',     Icon: SkinIcon,        color: '#22C55E', bgColor: '#DCFCE7', doctorCount: 0, nextAvailable: 'Today'},
  {id: 's5', name: 'Pediatrician',      Icon: BabyIcon,        color: '#F59E0B', bgColor: '#FEF3C7', doctorCount: 0, nextAvailable: 'Today'},
  {id: 's6', name: 'Orthopedic',        Icon: BoneIcon,        color: '#8B5CF6', bgColor: '#F5F3FF', doctorCount: 0, nextAvailable: 'Today'},
  {id: 's7', name: 'Neurologist',       Icon: BrainIcon,       color: '#EC4899', bgColor: '#FCE7F3', doctorCount: 0, nextAvailable: 'Today'},
  {id: 's8', name: 'ENT Specialist',    Icon: EarIcon,         color: '#14B8A6', bgColor: '#CCFBF1', doctorCount: 0, nextAvailable: 'Today'},
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Specialty', 'Doctor', 'Date & Time', 'Visit Type', 'Review', 'Payment'];
const TOTAL_STEPS = 6;

const VISIT_TYPES = [
  {id: 'clinic',  label: 'In-Clinic',      Icon: HospitalBuildingIcon, desc: 'Visit the doctor in person', discountPct: 0},
  {id: 'video',   label: 'Video Consult',   Icon: VideoIcon,            desc: 'HD video call consultation',  discountPct: 20},
  {id: 'audio',   label: 'Audio Call',      Icon: PhoneIcon,            desc: 'Consult over a phone call',   discountPct: 30},
];

const PAYMENT_METHODS = [
  {id: 'upi',        label: 'UPI',                    sub: 'Google Pay · PhonePe · Paytm', Icon: BoltIcon},
  {id: 'card',       label: 'Credit / Debit Card',    sub: 'Visa · Mastercard · RuPay',    Icon: WalletIcon},
  {id: 'netbanking', label: 'Net Banking',            sub: 'All major banks supported',    Icon: BankIcon},
  {id: 'cash',       label: 'Cash at Clinic',         sub: 'Pay when you visit',           Icon: CashIcon},
];

const MORNING   = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];
const AFTERNOON = ['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'];
const EVENING   = ['04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'];

const SPECIALTY_ICONS = {
  'General Physician': StethoscopeIcon,
  'Cardiologist':      HeartIcon,
  'Dentist':           ToothIcon,
  'Dermatologist':     SkinIcon,
  'Orthopedic':        BoneIcon,
};

// "14:30" → "02:30 PM"
function to12h(t) {
  const [hh, mm] = t.split(':');
  let h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${mm} ${ampm}`;
}

// Build "YYYY-MM-DD" from DATES item
function toISODate(dateItem) {
  const d = new Date();
  d.setDate(d.getDate() + Number(dateItem.key));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getNext14Days() {
  const D_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const M_NAMES  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today    = new Date();
  return Array.from({length: 14}, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      key:       i.toString(),
      dayLabel:  i === 0 ? 'Today' : i === 1 ? 'Tom' : D_NAMES[d.getDay()],
      dateNum:   d.getDate(),
      monthName: M_NAMES[d.getMonth()],
      fullDate:  `${M_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
    };
  });
}

const DATES = getNext14Days();

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({step}) {
  return (
    <View style={pb.wrap}>
      <View style={pb.track}>
        {Array.from({length: TOTAL_STEPS}, (_, i) => {
          const done   = i + 1 < step;
          const active = i + 1 === step;
          return (
            <React.Fragment key={i}>
              <View style={[pb.dot, done && pb.dotDone, active && pb.dotActive]}>
                {done
                  ? <Text style={pb.dotCheck}>✓</Text>
                  : <Text style={[pb.dotNum, active && pb.dotNumActive]}>{i + 1}</Text>}
              </View>
              {i < TOTAL_STEPS - 1 && (
                <View style={[pb.line, done && pb.lineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={pb.label}>{STEP_LABELS[step - 1]}</Text>
    </View>
  );
}

const pb = StyleSheet.create({
  wrap:        {paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  track:       {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  dot:         {width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
  dotDone:     {backgroundColor: colors.primary, borderColor: colors.primary},
  dotActive:   {borderColor: colors.primary, backgroundColor: colors.surface},
  dotNum:      {fontSize: 11, fontWeight: '700', color: colors.textMuted},
  dotNumActive:{color: colors.primary},
  dotCheck:    {fontSize: 11, color: '#fff', fontWeight: '700'},
  line:        {flex: 1, height: 2, backgroundColor: colors.border},
  lineDone:    {backgroundColor: colors.primary},
  label:       {fontSize: 13, fontWeight: '600', color: colors.primary, textAlign: 'center'},
});

function DoctorAvatar({name, size = 48}) {
  const initials = name.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = (name.charCodeAt(4) * 37) % 360;
  return (
    <View style={[av.circle, {width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},60%,88%)`}]}>
      <Text style={[av.text, {fontSize: size * 0.33, color: `hsl(${hue},50%,35%)`}]}>{initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  circle: {alignItems: 'center', justifyContent: 'center'},
  text:   {fontWeight: '800'},
});

function StarRating({rating}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
      <StarIcon size={12} color="#F59E0B" />
      <Text style={{fontSize: 12, fontWeight: '700', color: colors.textPrimary}}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function SectionDivider({label}) {
  return (
    <View style={sd.wrap}>
      <Text style={sd.text}>{label}</Text>
    </View>
  );
}
const sd = StyleSheet.create({
  wrap: {paddingVertical: spacing.sm, paddingTop: spacing.md},
  text: {fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AppointmentBookingScreen({navigation, route}) {
  const {bookAppointment, practitioners} = useApp();

  // Detect if coming with a pre-selected specialty
  const preSpecialtyName = route.params?.specialty;
  const preSpecialty     = preSpecialtyName
    ? SPECIALTIES.find(s => s.name === preSpecialtyName) || SPECIALTIES[0]
    : null;

  const [step,           setStep]           = useState(preSpecialty ? 2 : 1);
  const [confirmed,      setConfirmed]      = useState(false);
  const [selectedSpec,   setSelectedSpec]   = useState(preSpecialty);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate,   setSelectedDate]   = useState(DATES[0]);
  const [selectedTime,   setSelectedTime]   = useState(null);
  const [visitType,      setVisitType]      = useState(null);
  const [paymentMethod,  setPaymentMethod]  = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
  }, [step]);

  // ── Slot state (API-driven) ──────────────────────────────────────────────────
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots,        setSlots]        = useState([]);
  const [slotsError,   setSlotsError]   = useState('');

  const fetchSlots = useCallback(async (doctor, dateItem) => {
    const pid = doctor?.practitionerId || doctor?.id;
    if (!pid || !dateItem) return;

    setSlotsLoading(true);
    setSlotsError('');
    setSlots([]);
    setSelectedTime(null);

    const isoDate   = toISODate(dateItem);
    const patientId = await AsyncStorage.getItem('patientId') || '0';
    const res = await AppointmentApi.getAvailableSlots(patientId, isoDate, pid);

    if (res.success && res.data) {
      // Response: {availableSlotList: ["01:00", "01:10", ...]}
      const raw = res.data.availableSlotList || res.data.slots || res.data.data || [];
      const converted = raw.filter(s => s && /^\d{1,2}:\d{2}$/.test(s)).map(to12h);
      setSlots(converted);
      if (converted.length === 0) setSlotsError('No slots available for this date.');
    } else {
      setSlotsError('Could not load slots.');
    }
    setSlotsLoading(false);
  }, []);

  useEffect(() => {
    if (step === 3 && selectedDoctor) fetchSlots(selectedDoctor, selectedDate);
  }, [step, selectedDoctor, selectedDate, fetchSlots]);

  // Practitioners filtered by specialty — from context (API-loaded)
  const filteredDoctors = selectedSpec
    ? practitioners.filter(d => d.specialty === selectedSpec.name)
    : practitioners;

  // Fee calculation
  const baseFee       = selectedDoctor?.consultationFee ?? 0;
  const visitDiscount = visitType ? VISIT_TYPES.find(v => v.id === visitType)?.discountPct ?? 0 : 0;
  const finalFee      = Math.round(baseFee * (1 - visitDiscount / 100));

  const doctor   = selectedDoctor;
  const dateObj  = selectedDate;
  const vt       = VISIT_TYPES.find(v => v.id === visitType);
  const pm       = PAYMENT_METHODS.find(p => p.id === paymentMethod);

  // Navigation
  const goBack = () => {
    if (step === 1 || (preSpecialty && step === 2)) {
      navigation.goBack();
    } else {
      setStep(s => s - 1);
    }
  };

  const canNext = () => {
    if (step === 1) return !!selectedSpec;
    if (step === 2) return !!selectedDoctor;
    if (step === 3) return !!selectedDate && !!selectedTime;
    if (step === 4) return !!visitType;
    if (step === 5) return true;
    if (step === 6) return !!paymentMethod;
    return false;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      // Confirm booking
      bookAppointment({
        id:       Date.now().toString(),
        type:     `${selectedSpec?.name || 'General'} Consultation`,
        date:     dateObj.fullDate,
        time:     selectedTime,
        location: doctor?.clinic || 'City Health Clinic',
        doctor:   doctor?.name,
        status:   'Upcoming',
      });
      setConfirmed(true);
    }
  };

  const nextLabel = step === TOTAL_STEPS ? 'Confirm & Pay' : 'Continue';

  // ── Confirmed view ──────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <SafeAreaView style={[s.safe, {backgroundColor: colors.primaryLight}]}>
        <ScrollView contentContainerStyle={s.confirmedScroll}>
          <View style={s.confirmedIconWrap}>
            <CheckCircleIcon size={80} color={colors.primary} />
          </View>
          <Text style={s.confirmedTitle}>Appointment Confirmed!</Text>
          <Text style={s.confirmedSub}>Your booking is confirmed. We'll send you a reminder.</Text>

          <View style={s.confirmedCard}>
            <ConfirmRow label="Doctor"     value={doctor?.name} />
            <ConfirmRow label="Specialty"  value={selectedSpec?.name} />
            <ConfirmRow label="Date"       value={dateObj?.fullDate} />
            <ConfirmRow label="Time"       value={selectedTime} />
            <ConfirmRow label="Visit Type" value={vt?.label} />
            <ConfirmRow label="Location"   value={doctor?.clinic} />
            <View style={s.confirmedDivider} />
            <ConfirmRow label="Amount Paid" value={`₹${finalFee}`} highlight />
            <ConfirmRow label="Payment"     value={pm?.label} />
          </View>

          <TouchableOpacity
            style={s.confirmedBtn}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.85}>
            <Text style={s.confirmedBtnText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.confirmedBtnSecondary}
            onPress={() => navigation.navigate('Appointments')}
            activeOpacity={0.8}>
            <Text style={s.confirmedBtnSecondaryText}>View My Appointments</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Booking wizard ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.back} hitSlop={8}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Book Appointment</Text>
      </View>

      {/* Progress */}
      <ProgressBar step={step} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Specialty ─────────────────────────────── */}
        {step === 1 && (
          <View>
            <Text style={s.stepHeading}>Choose a Specialty</Text>
            <Text style={s.stepSub}>Select the type of doctor you need to consult.</Text>
            <View style={s.specGrid}>
              {SPECIALTIES.map(sp => {
                const Icon    = sp.Icon;
                const selected = selectedSpec?.id === sp.id;
                return (
                  <TouchableOpacity
                    key={sp.id}
                    style={[s.specCard, {borderColor: selected ? sp.color : colors.border, backgroundColor: selected ? sp.bgColor : colors.surface}]}
                    onPress={() => setSelectedSpec(sp)}
                    activeOpacity={0.8}>
                    <View style={[s.specIconWrap, {backgroundColor: selected ? sp.color + '22' : sp.bgColor}]}>
                      <Icon size={26} color={sp.color} />
                    </View>
                    <Text style={[s.specCardName, {color: selected ? sp.color : colors.textPrimary}]} numberOfLines={2}>{sp.name}</Text>
                    {selected && <View style={[s.specSelectedBadge, {backgroundColor: sp.color}]}><Text style={s.specSelectedCheck}>✓</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Step 2: Doctor ────────────────────────────────── */}
        {step === 2 && (
          <View>
            <Text style={s.stepHeading}>Choose a Doctor</Text>
            <Text style={s.stepSub}>{filteredDoctors.length} doctors available{selectedSpec ? ` for ${selectedSpec.name}` : ''}</Text>
            {filteredDoctors.length === 0 && (
              <Text style={[s.stepSub, {color: colors.textMuted}]}>No doctors loaded yet. Pull to refresh or try again.</Text>
            )}
            {(filteredDoctors.length > 0 ? filteredDoctors : practitioners).map(d => {
              const selected = selectedDoctor?.id === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[s.doctorCard, selected && s.doctorCardSelected]}
                  onPress={() => setSelectedDoctor(d)}
                  activeOpacity={0.8}>
                  <DoctorAvatar name={d.name} size={56} />
                  <View style={s.doctorInfo}>
                    <Text style={s.doctorName}>{d.name}</Text>
                    <Text style={s.doctorSpec}>{d.specialty} · {d.experience ? `${d.experience}+ yrs` : ''}</Text>
                    <View style={s.doctorMeta}>
                      <StarRating rating={d.rating || 4.5} />
                      {d.reviewCount > 0 && <Text style={s.doctorReviews}>({d.reviewCount.toLocaleString()})</Text>}
                      <View style={[s.availBadge, {backgroundColor: colors.successLight}]}>
                        <Text style={[s.availText, {color: colors.success}]}>{d.availability || 'Available'}</Text>
                      </View>
                    </View>
                    <View style={s.doctorClinicRow}>
                      <PinIcon size={11} color={colors.textMuted} />
                      <Text style={s.doctorClinic}>{d.clinic}</Text>
                    </View>
                  </View>
                  <View style={s.doctorFeeCol}>
                    <Text style={s.doctorFee}>₹{d.consultationFee}</Text>
                    <Text style={s.doctorFeeLabel}>fee</Text>
                    {selected && (
                      <View style={s.doctorSelectedDot}>
                        <Text style={{color: '#fff', fontSize: 10}}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Step 3: Date & Time ───────────────────────────── */}
        {step === 3 && (
          <View>
            <Text style={s.stepHeading}>Select Date & Time</Text>
            <Text style={s.stepSub}>Pick a date and time that works for you.</Text>

            {/* Date strip */}
            <FlatList
              data={DATES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.key}
              contentContainerStyle={s.dateStrip}
              renderItem={({item}) => {
                const selected = selectedDate?.key === item.key;
                return (
                  <TouchableOpacity
                    style={[s.datePill, selected && s.datePillSelected]}
                    onPress={() => { setSelectedDate(item); setSelectedTime(null); }}
                    activeOpacity={0.8}>
                    <Text style={[s.datePillDay, selected && s.datePillTextSelected]}>{item.dayLabel}</Text>
                    <Text style={[s.datePillNum, selected && s.datePillTextSelected]}>{item.dateNum}</Text>
                    <Text style={[s.datePillMonth, selected && s.datePillTextSelected]}>{item.monthName}</Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Time slots — from API in grid */}
            {slotsLoading ? (
              <View style={{alignItems: 'center', paddingVertical: 48}}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{marginTop: 12, fontSize: 13, color: colors.textSecondary}}>Loading slots…</Text>
              </View>
            ) : slotsError ? (
              <View style={{alignItems: 'center', paddingVertical: 48}}>
                <Text style={{fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12}}>{slotsError}</Text>
                <TouchableOpacity onPress={() => fetchSlots(selectedDoctor, selectedDate)} style={{paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.primary}}>
                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 13}}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={tg.grid}>
                {slots.map(t => {
                  const sel = selectedTime === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[tg.slot, sel && tg.slotSelected]}
                      onPress={() => setSelectedTime(t)}
                      activeOpacity={0.8}>
                      <Text style={[tg.slotText, sel && tg.slotTextSelected]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
                {slots.length === 0 && <Text style={{fontSize: 13, color: colors.textMuted}}>Select a date to see available slots.</Text>}
              </View>
            )}
          </View>
        )}

        {/* ── Step 4: Visit Type ────────────────────────────── */}
        {step === 4 && (
          <View>
            <Text style={s.stepHeading}>Choose Visit Type</Text>
            <Text style={s.stepSub}>How would you like to consult {doctor?.name}?</Text>
            {VISIT_TYPES.map(vt => {
              const selected = visitType === vt.id;
              const discountedFee = Math.round(baseFee * (1 - vt.discountPct / 100));
              return (
                <TouchableOpacity
                  key={vt.id}
                  style={[s.visitCard, selected && s.visitCardSelected]}
                  onPress={() => setVisitType(vt.id)}
                  activeOpacity={0.8}>
                  <View style={[s.visitIconWrap, selected && s.visitIconWrapActive]}>
                    <vt.Icon size={22} color={selected ? colors.primary : colors.textSecondary} />
                  </View>
                  <View style={s.visitInfo}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                      <Text style={[s.visitLabel, selected && {color: colors.primary}]}>{vt.label}</Text>
                      {vt.discountPct > 0 && (
                        <View style={s.discountBadge}>
                          <Text style={s.discountText}>{vt.discountPct}% off</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.visitDesc}>{vt.desc}</Text>
                  </View>
                  <View style={s.visitFeeCol}>
                    {vt.discountPct > 0 && (
                      <Text style={s.visitOrigFee}>₹{baseFee}</Text>
                    )}
                    <Text style={[s.visitFee, selected && {color: colors.primary}]}>₹{discountedFee}</Text>
                  </View>
                  {selected && <View style={s.visitCheck}><Text style={{color: '#fff', fontSize: 11}}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Step 5: Review ────────────────────────────────── */}
        {step === 5 && (
          <View>
            <Text style={s.stepHeading}>Review Booking</Text>
            <Text style={s.stepSub}>Please review your appointment details before payment.</Text>

            {/* Doctor summary */}
            <View style={s.reviewCard}>
              <Text style={s.reviewCardTitle}>Doctor</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm}}>
                <DoctorAvatar name={doctor?.name || ''} size={48} />
                <View style={{flex: 1}}>
                  <Text style={s.reviewDoctorName}>{doctor?.name}</Text>
                  <Text style={s.reviewDoctorSpec}>{doctor?.specialty}</Text>
                  <View style={s.reviewClinicRow}>
                    <PinIcon size={11} color={colors.textMuted} />
                    <Text style={s.reviewClinic}>{doctor?.clinic}</Text>
                  </View>
                </View>
                <StarRating rating={doctor?.rating || 0} />
              </View>
            </View>

            {/* Appointment details */}
            <View style={s.reviewCard}>
              <Text style={s.reviewCardTitle}>Appointment Details</Text>
              <ReviewRow icon={CalendarIcon}  label="Date"       value={dateObj?.fullDate} />
              <ReviewRow icon={ClockIcon}     label="Time"       value={selectedTime} />
              <ReviewRow icon={vt?.Icon}      label="Visit Type" value={vt?.label} />
              <ReviewRow icon={PinIcon}       label="Location"   value={vt?.id === 'clinic' ? doctor?.clinic : 'Online'} />
            </View>

            {/* Fare breakdown */}
            <View style={s.reviewCard}>
              <Text style={s.reviewCardTitle}>Fare Breakdown</Text>
              <View style={s.fareRow}>
                <Text style={s.fareLabel}>Consultation Fee</Text>
                <Text style={s.fareVal}>₹{baseFee}</Text>
              </View>
              {visitDiscount > 0 && (
                <View style={s.fareRow}>
                  <Text style={[s.fareLabel, {color: colors.success}]}>{vt?.label} Discount ({visitDiscount}%)</Text>
                  <Text style={[s.fareVal, {color: colors.success}]}>- ₹{baseFee - finalFee}</Text>
                </View>
              )}
              <View style={s.fareDivider} />
              <View style={s.fareRow}>
                <Text style={[s.fareLabel, {fontWeight: '800', color: colors.textPrimary}]}>Total Payable</Text>
                <Text style={[s.fareVal,  {fontWeight: '800', color: colors.primary, fontSize: 16}]}>₹{finalFee}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Step 6: Payment ───────────────────────────────── */}
        {step === 6 && (
          <View>
            <Text style={s.stepHeading}>Payment Method</Text>
            <Text style={s.stepSub}>Choose how you'd like to pay ₹{finalFee}.</Text>

            {PAYMENT_METHODS.map(pm => {
              const selected = paymentMethod === pm.id;
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[s.payCard, selected && s.payCardSelected]}
                  onPress={() => setPaymentMethod(pm.id)}
                  activeOpacity={0.8}>
                  <View style={[s.payIconWrap, selected && s.payIconWrapActive]}>
                    <pm.Icon size={22} color={selected ? colors.primary : colors.textSecondary} />
                  </View>
                  <View style={s.payInfo}>
                    <Text style={[s.payLabel, selected && {color: colors.primary}]}>{pm.label}</Text>
                    <Text style={s.paySub}>{pm.sub}</Text>
                  </View>
                  <View style={[s.payRadio, selected && s.payRadioSelected]}>
                    {selected && <View style={s.payRadioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Total reminder */}
            <View style={s.totalBanner}>
              <Text style={s.totalBannerLabel}>Amount to be paid</Text>
              <Text style={s.totalBannerAmt}>₹{finalFee}</Text>
            </View>
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, !canNext() && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canNext()}
          activeOpacity={0.85}>
          <Text style={s.nextBtnText}>{nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TimeGroup({label, slots, selected, onSelect}) {
  return (
    <View>
      <Text style={tg.groupLabel}>{label}</Text>
      <View style={tg.grid}>
        {slots.map(t => {
          const sel = selected === t;
          return (
            <TouchableOpacity
              key={t}
              style={[tg.slot, sel && tg.slotSelected]}
              onPress={() => onSelect(t)}
              activeOpacity={0.8}>
              <Text style={[tg.slotText, sel && tg.slotTextSelected]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tg = StyleSheet.create({
  groupLabel:      {fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm},
  grid:            {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  slot:            {paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, minWidth: (SW - spacing.base * 2 - spacing.sm * 3) / 4, alignItems: 'center'},
  slotSelected:    {backgroundColor: colors.primary, borderColor: colors.primary},
  slotText:        {fontSize: 12, fontWeight: '600', color: colors.textPrimary},
  slotTextSelected:{color: '#fff'},
});

function ReviewRow({icon: Icon, label, value}) {
  return (
    <View style={rr.row}>
      <View style={rr.iconWrap}>
        <Icon size={15} color={colors.textSecondary} />
      </View>
      <Text style={rr.label}>{label}</Text>
      <Text style={rr.value}>{value}</Text>
    </View>
  );
}
const rr = StyleSheet.create({
  row:    {flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: spacing.sm},
  iconWrap: {width: 22, alignItems: 'center'},
  label:  {flex: 1, fontSize: 13, color: colors.textSecondary},
  value:  {fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right', flex: 1},
});

function ConfirmRow({label, value, highlight}) {
  return (
    <View style={cr.row}>
      <Text style={cr.label}>{label}</Text>
      <Text style={[cr.value, highlight && {color: colors.primary, fontSize: 16}]}>{value}</Text>
    </View>
  );
}
const cr = StyleSheet.create({
  row:   {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7},
  label: {fontSize: 13, color: colors.textSecondary, flex: 1},
  value: {fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'right', flex: 1},
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:         {flex: 1, backgroundColor: colors.background},
  header:       {flexDirection: 'row', alignItems: 'center', padding: spacing.base, paddingTop: spacing['4xl'], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  back:         {padding: 4, marginRight: spacing.sm},
  headerTitle:  {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  scroll:       {padding: spacing.base, paddingTop: spacing.md},

  stepHeading:  {fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs},
  stepSub:      {fontSize: 13, color: colors.textSecondary, marginBottom: spacing.base, lineHeight: 19},

  // Specialty grid
  specGrid:          {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md},
  specCard:          {width: (SW - spacing.base * 2 - spacing.md) / 2, borderRadius: radius.lg, borderWidth: 2, padding: spacing.md, backgroundColor: colors.surface, ...shadows.sm, position: 'relative'},
  specIconWrap:      {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm},
  specCardName:      {fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 3},
  specSelectedBadge: {position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  specSelectedCheck: {color: '#fff', fontSize: 11, fontWeight: '800'},

  // Doctor card
  doctorCard:         {flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.sm, borderWidth: 2, borderColor: 'transparent', gap: spacing.md},
  doctorCardSelected: {borderColor: colors.primary},
  doctorInfo:         {flex: 1},
  doctorName:         {fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 2},
  doctorSpec:         {fontSize: 12, color: colors.textSecondary, marginBottom: 6},
  doctorMeta:         {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  doctorReviews:      {fontSize: 11, color: colors.textMuted},
  availBadge:         {paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full},
  availText:          {fontSize: 10, fontWeight: '700'},
  doctorClinicRow:    {flexDirection: 'row', alignItems: 'center', gap: 4},
  doctorClinic:       {fontSize: 11, color: colors.textMuted},
  doctorFeeCol:       {alignItems: 'flex-end', gap: 2},
  doctorFee:          {fontSize: 16, fontWeight: '800', color: colors.primary},
  doctorFeeLabel:     {fontSize: 10, color: colors.textMuted},
  doctorSelectedDot:  {width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4},

  // Date strip
  dateStrip:        {gap: spacing.sm, paddingBottom: spacing.sm},
  datePill:         {alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, minWidth: 62},
  datePillSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  datePillDay:      {fontSize: 10, fontWeight: '600', color: colors.textMuted, marginBottom: 2},
  datePillNum:      {fontSize: 18, fontWeight: '800', color: colors.textPrimary},
  datePillMonth:    {fontSize: 10, fontWeight: '600', color: colors.textMuted, marginTop: 2},
  datePillTextSelected: {color: '#fff'},

  // Visit type
  visitCard:        {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.sm, borderWidth: 2, borderColor: 'transparent', gap: spacing.md, position: 'relative'},
  visitCardSelected:{borderColor: colors.primary, backgroundColor: colors.primaryLight},
  visitIconWrap:    {width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background},
  visitIconWrapActive:{width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '22'},
  visitInfo:        {flex: 1},
  visitLabel:       {fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 3},
  visitDesc:        {fontSize: 12, color: colors.textSecondary},
  visitFeeCol:      {alignItems: 'flex-end'},
  visitOrigFee:     {fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through'},
  visitFee:         {fontSize: 16, fontWeight: '800', color: colors.textPrimary},
  discountBadge:    {backgroundColor: colors.successLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full},
  discountText:     {fontSize: 10, fontWeight: '700', color: colors.success},
  visitCheck:       {position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},

  // Review
  reviewCard:       {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm, marginBottom: spacing.md},
  reviewCardTitle:  {fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm},
  reviewDoctorName: {fontSize: 15, fontWeight: '800', color: colors.textPrimary},
  reviewDoctorSpec: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  reviewClinicRow:  {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3},
  reviewClinic:     {fontSize: 11, color: colors.textMuted},
  fareRow:          {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
  fareLabel:        {fontSize: 13, color: colors.textSecondary},
  fareVal:          {fontSize: 13, fontWeight: '600', color: colors.textPrimary},
  fareDivider:      {height: 1, backgroundColor: colors.border, marginVertical: spacing.sm},

  // Payment
  payCard:          {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.sm, borderWidth: 2, borderColor: 'transparent', gap: spacing.md},
  payCardSelected:  {borderColor: colors.primary},
  payIconWrap:      {width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background},
  payIconWrapActive:{width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '22'},
  payInfo:          {flex: 1},
  payLabel:         {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  paySub:           {fontSize: 11, color: colors.textMuted, marginTop: 2},
  payRadio:         {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  payRadioSelected: {borderColor: colors.primary},
  payRadioDot:      {width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary},
  totalBanner:      {backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm},
  totalBannerLabel: {fontSize: 14, fontWeight: '600', color: colors.primary},
  totalBannerAmt:   {fontSize: 22, fontWeight: '900', color: colors.primary},

  // Footer
  footer:       {position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.base, paddingBottom: spacing['2xl'], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border},
  nextBtn:      {backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.base + 2, alignItems: 'center'},
  nextBtnDisabled: {backgroundColor: '#C4B5FD'},
  nextBtnText:  {color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3},

  // Confirmed
  confirmedScroll:       {flexGrow: 1, padding: spacing.base, paddingTop: spacing['4xl'], alignItems: 'center'},
  confirmedIconWrap:     {marginBottom: spacing.lg},
  confirmedTitle:        {fontSize: 24, fontWeight: '900', color: colors.primary, marginBottom: spacing.sm, textAlign: 'center'},
  confirmedSub:          {fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 21},
  confirmedCard:         {width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm, marginBottom: spacing.xl},
  confirmedDivider:      {height: 1, backgroundColor: colors.border, marginVertical: spacing.sm},
  confirmedBtn:          {width: '100%', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.base + 2, alignItems: 'center', marginBottom: spacing.sm},
  confirmedBtnText:      {color: '#fff', fontSize: 16, fontWeight: '800'},
  confirmedBtnSecondary: {width: '100%', borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.base, alignItems: 'center'},
  confirmedBtnSecondaryText: {color: colors.primary, fontSize: 15, fontWeight: '700'},
});