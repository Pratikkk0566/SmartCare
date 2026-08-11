import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {AppointmentApi, PatientApi, HospitalApi} from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ArrowBackIcon, HospitalBuildingIcon, VideoIcon, PhoneIcon, ClockIcon} from '../../assets/icons/Icons';

const {width: SW} = Dimensions.get('window');

const VISIT_TYPES = [
  {id: 'clinic', label: 'In-Clinic', Icon: HospitalBuildingIcon, feeKey: 'consultationFee', desc: 'Visit in person'},
  {id: 'video',  label: 'Video',     Icon: VideoIcon,            feeKey: 'videoFee',        desc: 'HD video call',  savePct: 20},
  {id: 'audio',  label: 'Audio',     Icon: PhoneIcon,            feeKey: 'audioFee',        desc: 'Phone call',     savePct: 30},
];

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// Convert 24h "HH:MM" → 12h "HH:MM AM/PM"
function to12h(t = '') {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${mStr || '00'} ${ampm}`;
}

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toDisplayDate(y, m, d) {
  return `${MONTH_NAMES[m]} ${d}, ${y}`;
}

// ─── Calendar Component ───────────────────────────────────────────────────────
function CalendarPicker({selectedISO, onSelect}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build the grid — pad with nulls for the leading weekday offset
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={cal.container}>
      {/* Month / year navigation */}
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn} hitSlop={8}>
          <Text style={cal.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={cal.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn} hitSlop={8}>
          <Text style={cal.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={cal.weekRow}>
        {DAY_NAMES.map(d => (
          <Text key={d} style={cal.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Date grid */}
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={cal.cell} />;

          const cellDate = new Date(viewYear, viewMonth, day);
          cellDate.setHours(0, 0, 0, 0);
          const isPast     = cellDate < today;
          const isToday    = cellDate.getTime() === today.getTime();
          const iso        = toISO(viewYear, viewMonth, day);
          const isSelected = iso === selectedISO;
          // Only allow today and future dates
          const isSelectable = !isPast;

          return (
            <TouchableOpacity
              key={iso}
              style={[
                cal.cell,
                isToday    && cal.todayCell,
                isSelected && cal.selectedCell,
              ]}
              onPress={() => isSelectable && onSelect(iso, viewYear, viewMonth, day)}
              activeOpacity={isSelectable ? 0.7 : 1}
              disabled={isPast}>
              <Text style={[
                cal.dayText,
                isPast     && cal.pastText,
                isToday    && cal.todayText,
                isSelected && cal.selectedText,
                (!isPast && !isToday && !isSelected) && cal.futureText,
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = Math.floor((SW - spacing.base * 2 - 24) / 7);

const cal = StyleSheet.create({
  container:   {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm},
  header:      {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.base},
  navBtn:      {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  navArrow:    {fontSize: 22, color: colors.textSecondary, fontWeight: '300'},
  monthTitle:  {fontSize: 16, fontWeight: '700', color: colors.textPrimary},
  weekRow:     {flexDirection: 'row', marginBottom: 6},
  weekDay:     {width: CELL_SIZE, textAlign: 'center', fontSize: 12, fontWeight: '600',
                color: colors.textSecondary, paddingVertical: 4},
  grid:        {flexDirection: 'row', flexWrap: 'wrap'},
  cell:        {width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center'},
  todayCell:   {backgroundColor: '#F59E0B', borderRadius: CELL_SIZE / 2},
  selectedCell:{backgroundColor: colors.primary, borderRadius: CELL_SIZE / 2},
  dayText:     {fontSize: 14, fontWeight: '400', color: colors.textSecondary},
  pastText:    {color: colors.border},
  todayText:   {color: '#fff', fontWeight: '700'},
  selectedText:{color: '#fff', fontWeight: '800'},
  futureText:  {color: colors.textPrimary, fontWeight: '600'},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingSlotScreen({navigation, route}) {
  const {doctorId}       = route.params;
  const {practitioners}  = useApp();
  const d = practitioners.find(doc => String(doc.id) === String(doctorId));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  const [selectedISO,   setSelectedISO]   = useState(todayISO);
  const [selectedLabel, setSelectedLabel] = useState(
    toDisplayDate(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [selectedVisit, setSelectedVisit] = useState('clinic');
  const [slots,         setSlots]         = useState([]);
  const [loadingSlots,  setLoadingSlots]  = useState(false);

  const handleDateSelect = useCallback((iso, y, m, day) => {
    setSelectedISO(iso);
    setSelectedLabel(toDisplayDate(y, m, day));
    setSelectedSlot(null);
  }, []);

  // Fetch slots + patient + clinic details in parallel (matching website behaviour)
  useEffect(() => {
    if (!d || !selectedISO) return;
    let cancelled = false;
    async function fetchAll() {
      setLoadingSlots(true);
      setSlots([]);

      const patientId  = await AsyncStorage.getItem('patientId') || '0';
      const mobileNo   = await AsyncStorage.getItem('mobileNumber') || '';

      // Call all 3 APIs in parallel — same as the website does after date selection
      const [slotsResult, patientResult, clinicResult] = await Promise.all([
        AppointmentApi.getAvailableSlots(patientId, selectedISO, d.id),
        mobileNo ? PatientApi.getByMobile(mobileNo.replace(/\D/g,'').slice(-10)) : Promise.resolve({success: false}),
        HospitalApi.getDetails(),
      ]);

      if (cancelled) return;

      // Store patient + clinic data so BookingConfirm doesn't need to re-fetch
      if (patientResult.success) {
        const raw = patientResult.data;
        const pt  = Array.isArray(raw) ? raw[0] : (raw?.patient || raw);
        if (pt?.id) {
          await AsyncStorage.setItem('patientId',           String(pt.id));
          await AsyncStorage.setItem('SELCETEDPATIENTDETAILS', JSON.stringify(pt));
        }
      }
      if (clinicResult.success && clinicResult.data) {
        await AsyncStorage.setItem('CLINICDETAILS', JSON.stringify(clinicResult.data));
      }

      // Map slots
      if (slotsResult.success) {
        const raw = Array.isArray(slotsResult.data) ? slotsResult.data
                  : (slotsResult.data?.slots || slotsResult.data?.slotList || []);
        const mapped = raw.map((s, idx) => {
          if (typeof s === 'string') {
            return {slotId: idx, display: to12h(s), raw24: s, commencing: selectedISO, weekfullname: ''};
          }
          const raw24 = s.starttime || s.slot || s.time || '';
          return {
            slotId:       s.id || s.slotId || s.apmslotid || idx,
            display:      to12h(raw24),
            raw24,
            commencing:   s.commencing   || selectedISO,
            weekfullname: s.weekfullname || '',
            _raw:         s,
          };
        }).filter(s => s.display);
        setSlots(mapped);
      }
      setLoadingSlots(false);
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [selectedISO, d]);

  if (!d) return null;

  const currentVisit = VISIT_TYPES.find(v => v.id === selectedVisit);
  const fee          = d[currentVisit?.feeKey] ?? d.consultationFee ?? 0;
  const canContinue  = !!selectedSlot;

  const handleContinue = () => {
    navigation.navigate('BookingConfirm', {
      doctorId,
      date:      selectedLabel,
      isoDate:   selectedISO,
      time:      selectedSlot?.display || '',
      slot:      selectedSlot,
      visitType: selectedVisit,
    });
  };

  const initials = (d.name || '').replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
  const hue      = ((d.name || '').charCodeAt(4) || 0) * 37 % 360;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} hitSlop={8}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Select Date & Time</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Doctor mini-card */}
        <View style={s.docCard}>
          <View style={[s.docAvatar, {backgroundColor: `hsl(${hue},55%,88%)`}]}>
            <Text style={[s.docAvatarText, {color: `hsl(${hue},45%,30%)`}]}>{initials}</Text>
          </View>
          <View style={s.docInfo}>
            <Text style={s.docName}>{d.name}</Text>
            <Text style={s.docSpec}>{d.specialty}{d.clinic ? ` · ${d.clinic}` : ''}</Text>
          </View>
          <Text style={s.docFee}>₹{fee}</Text>
        </View>

        {/* Visit Type */}
        <SectionLabel>Visit Type</SectionLabel>
        <View style={s.visitRow}>
          {VISIT_TYPES.map(vt => {
            const vtFee  = d[vt.feeKey] ?? 0;
            const active = selectedVisit === vt.id;
            return (
              <TouchableOpacity
                key={vt.id}
                style={[s.visitCard, active && s.visitCardActive]}
                onPress={() => setSelectedVisit(vt.id)}
                activeOpacity={0.8}>
                <View style={[s.visitIconWrap, active && s.visitIconWrapActive]}>
                  <vt.Icon size={22} color={active ? colors.primary : colors.textSecondary} />
                </View>
                <Text style={[s.visitLabel, active && s.visitLabelActive]}>{vt.label}</Text>
                <Text style={[s.visitFee, active && s.visitFeeActive]}>₹{vtFee}</Text>
                {vt.savePct && (
                  <View style={s.saveBadge}>
                    <Text style={s.saveBadgeText}>{vt.savePct}% off</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Calendar */}
        <SectionLabel>Select Date</SectionLabel>
        <CalendarPicker selectedISO={selectedISO} onSelect={handleDateSelect} />

        {/* Time Slots */}
        <SectionLabel>
          Available Slots{selectedLabel ? ` · ${selectedLabel}` : ''}
        </SectionLabel>

        {loadingSlots ? (
          <ActivityIndicator size="small" color={colors.primary} style={{marginVertical: 24}} />
        ) : slots.length === 0 ? (
          <View style={s.emptySlots}>
            <ClockIcon size={36} color={colors.textMuted} />
            <Text style={s.emptySlotsText}>No available slots for this date.</Text>
            <Text style={s.emptySlotsHint}>Try selecting a different date.</Text>
          </View>
        ) : (
          <TimeGrid slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} />
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Footer CTA */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          {selectedSlot
            ? <>
                <Text style={s.footerDateText}>{selectedLabel}</Text>
                <Text style={s.footerTimeText}>{selectedSlot.display} · {currentVisit?.label}</Text>
              </>
            : <Text style={s.footerPlaceholder}>Pick a date & time slot above</Text>
          }
        </View>
        <TouchableOpacity
          style={[s.continueBtn, !canContinue && s.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.88}>
          <Text style={s.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Time grid ────────────────────────────────────────────────────────────────
function TimeGrid({slots, selected, onSelect}) {
  const cols  = 4;
  const slotW = (SW - spacing.base * 2 - spacing.sm * (cols - 1)) / cols;
  return (
    <View style={tg.grid}>
      {slots.map(slot => {
        const active = selected?.slotId === slot.slotId;
        return (
          <TouchableOpacity
            key={String(slot.slotId)}
            onPress={() => onSelect(slot)}
            style={[tg.slot, {width: slotW}, active && tg.slotActive]}
            activeOpacity={0.8}>
            <Text style={[tg.text, active && tg.textActive]}>{slot.display}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tg = StyleSheet.create({
  grid:       {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm},
  slot:       {paddingVertical: spacing.sm + 2, borderRadius: radius.sm, borderWidth: 1.5,
               borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center'},
  slotActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  text:       {fontSize: 12, fontWeight: '600', color: colors.textPrimary},
  textActive: {color: '#fff'},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({children}) {
  return <Text style={sl.text}>{children}</Text>;
}
const sl = StyleSheet.create({
  text: {fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase',
         letterSpacing: 0.7, marginTop: spacing.lg, marginBottom: spacing.sm},
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   {flex: 1, backgroundColor: colors.background},

  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base,
           paddingTop: spacing['4xl'], paddingBottom: spacing.md, backgroundColor: colors.surface,
           borderBottomWidth: 1, borderBottomColor: colors.border},
  back:   {padding: 4},
  headerTitle: {fontSize: 18, fontWeight: '800', color: colors.textPrimary},

  scroll: {padding: spacing.base},

  docCard:       {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface,
                  borderRadius: radius.lg, padding: spacing.base, ...shadows.sm},
  docAvatar:     {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
  docAvatarText: {fontSize: 15, fontWeight: '900'},
  docInfo:       {flex: 1},
  docName:       {fontSize: 14, fontWeight: '800', color: colors.textPrimary},
  docSpec:       {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  docFee:        {fontSize: 16, fontWeight: '900', color: colors.primary},

  visitRow:         {flexDirection: 'row', gap: spacing.sm},
  visitCard:        {flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg,
                     padding: spacing.md, borderWidth: 2, borderColor: colors.border, gap: 4, position: 'relative'},
  visitCardActive:  {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  visitIconWrap:     {width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background},
  visitIconWrapActive:{width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '22'},
  visitLabel:       {fontSize: 12, fontWeight: '700', color: colors.textSecondary},
  visitLabelActive: {color: colors.primary},
  visitFee:         {fontSize: 13, fontWeight: '800', color: colors.textPrimary},
  visitFeeActive:   {color: colors.primary},
  saveBadge:        {position: 'absolute', top: -8, right: -4, backgroundColor: colors.success,
                     paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.full},
  saveBadgeText:    {fontSize: 8, fontWeight: '800', color: '#fff'},

  emptySlots:     {alignItems: 'center', paddingVertical: 32, gap: 8},
  emptySlotsText: {fontSize: 14, fontWeight: '600', color: colors.textPrimary},
  emptySlotsHint: {fontSize: 12, color: colors.textMuted, marginTop: 4},

  footer:             {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface,
                       padding: spacing.base, paddingBottom: spacing['2xl'], borderTopWidth: 1,
                       borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.base},
  footerLeft:         {flex: 1},
  footerDateText:     {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  footerTimeText:     {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  footerPlaceholder:  {fontSize: 13, color: colors.textMuted},
  continueBtn:        {backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
                       paddingVertical: spacing.base, borderRadius: radius.full},
  continueBtnDisabled:{backgroundColor: '#C4B5FD'},
  continueBtnText:    {color: '#fff', fontSize: 15, fontWeight: '800'},
});
