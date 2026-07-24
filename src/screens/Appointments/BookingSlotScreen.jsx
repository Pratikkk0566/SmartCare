import React, {useState, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {doctors} from '../../data/mockData';
import {ArrowBackIcon} from '../../assets/icons/Icons';

const {width: SW} = Dimensions.get('window');

// ─── Static data ──────────────────────────────────────────────────────────────

const VISIT_TYPES = [
  {id: 'clinic', label: 'In-Clinic', emoji: '🏥', feeKey: 'consultationFee', desc: 'Visit in person'},
  {id: 'video',  label: 'Video',     emoji: '📹', feeKey: 'videoFee',        desc: 'HD video call',   savePct: 20},
  {id: 'audio',  label: 'Audio',     emoji: '📞', feeKey: 'audioFee',        desc: 'Phone call',      savePct: 30},
];

const MORNING   = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];
const AFTERNOON = ['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'];
const EVENING   = ['04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'];

// Some slots are "booked" for realism – randomly seeded by slot string
const BOOKED_POOL = ['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '05:00 PM'];

function isBooked(slot) { return BOOKED_POOL.includes(slot); }

function getNext14Days() {
  const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  return Array.from({length: 14}, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      key:      i.toString(),
      shortDay: i === 0 ? 'Today' : i === 1 ? 'Tom' : D[d.getDay()],
      dateNum:  d.getDate(),
      month:    M[d.getMonth()],
      fullDate: `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      isToday:  i === 0,
    };
  });
}

const DATES = getNext14Days();

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingSlotScreen({navigation, route}) {
  const {doctorId} = route.params;
  const d = doctors.find(doc => doc.id === doctorId);

  const [selectedDate,  setSelectedDate]  = useState(DATES[0]);
  const [selectedTime,  setSelectedTime]  = useState(null);
  const [selectedVisit, setSelectedVisit] = useState('clinic');

  const dateRef = useRef(null);

  if (!d) return null;

  const currentVisit = VISIT_TYPES.find(v => v.id === selectedVisit);
  const fee = d[currentVisit?.feeKey] ?? d.consultationFee;

  const canContinue = !!selectedTime;

  const handleContinue = () => {
    navigation.navigate('BookingConfirm', {
      doctorId,
      date:      selectedDate.fullDate,
      time:      selectedTime,
      visitType: selectedVisit,
    });
  };

  // ── Doctor mini-card ──────────────────────────────────────────────────────
  const initials = d.name.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
  const hue      = (d.name.charCodeAt(4) * 37) % 360;

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

        {/* ── Doctor mini-card ── */}
        <View style={s.docCard}>
          <View style={[s.docAvatar, {backgroundColor: `hsl(${hue},55%,88%)`}]}>
            <Text style={[s.docAvatarText, {color: `hsl(${hue},45%,30%)`}]}>{initials}</Text>
          </View>
          <View style={s.docInfo}>
            <Text style={s.docName}>{d.name}</Text>
            <Text style={s.docSpec}>{d.specialty} · {d.clinic}</Text>
          </View>
          <Text style={s.docFee}>₹{fee}</Text>
        </View>

        {/* ── Visit Type ── */}
        <SectionLabel>Visit Type</SectionLabel>
        <View style={s.visitRow}>
          {VISIT_TYPES.map(vt => {
            const vtFee = d[vt.feeKey];
            const active = selectedVisit === vt.id;
            return (
              <TouchableOpacity
                key={vt.id}
                style={[s.visitCard, active && s.visitCardActive]}
                onPress={() => setSelectedVisit(vt.id)}
                activeOpacity={0.8}>
                <Text style={s.visitEmoji}>{vt.emoji}</Text>
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

        {/* ── Date strip ── */}
        <SectionLabel>Select Date</SectionLabel>
        <FlatList
          ref={dateRef}
          data={DATES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.key}
          contentContainerStyle={s.dateStrip}
          renderItem={({item}) => {
            const active = selectedDate?.key === item.key;
            return (
              <TouchableOpacity
                style={[s.datePill, active && s.datePillActive]}
                onPress={() => { setSelectedDate(item); setSelectedTime(null); }}
                activeOpacity={0.8}>
                <Text style={[s.datePillDay, active && s.datePillTextActive]}>{item.shortDay}</Text>
                <Text style={[s.datePillNum, active && s.datePillTextActive]}>{item.dateNum}</Text>
                <Text style={[s.datePillMon, active && s.datePillTextActive]}>{item.month}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* ── Time slots ── */}
        <SectionLabel>Morning  ·  6 AM – 12 PM</SectionLabel>
        <TimeGrid slots={MORNING} selected={selectedTime} onSelect={setSelectedTime} />

        <SectionLabel>Afternoon  ·  12 PM – 5 PM</SectionLabel>
        <TimeGrid slots={AFTERNOON} selected={selectedTime} onSelect={setSelectedTime} />

        <SectionLabel>Evening  ·  5 PM – 9 PM</SectionLabel>
        <TimeGrid slots={EVENING} selected={selectedTime} onSelect={setSelectedTime} />

        {/* Legend */}
        <View style={s.legend}>
          <LegendDot color={colors.primary} label="Selected" />
          <LegendDot color={colors.border} label="Available" />
          <LegendDot color={colors.background} label="Booked" strikethrough />
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* ── Footer CTA ── */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          {selectedDate && selectedTime
            ? <>
                <Text style={s.footerDateText}>{selectedDate.fullDate}</Text>
                <Text style={s.footerTimeText}>{selectedTime} · {currentVisit?.label}</Text>
              </>
            : <Text style={s.footerPlaceholder}>Pick a date & time slot</Text>
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

// ─── Time grid component ──────────────────────────────────────────────────────

function TimeGrid({slots, selected, onSelect}) {
  const cols = 4;
  const slotW = (SW - spacing.base * 2 - spacing.sm * (cols - 1)) / cols;
  return (
    <View style={tg.grid}>
      {slots.map(t => {
        const booked = isBooked(t);
        const active = selected === t;
        return (
          <TouchableOpacity
            key={t}
            disabled={booked}
            onPress={() => onSelect(t)}
            style={[
              tg.slot,
              {width: slotW},
              active && tg.slotActive,
              booked && tg.slotBooked,
            ]}
            activeOpacity={0.8}>
            <Text style={[tg.text, active && tg.textActive, booked && tg.textBooked]}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tg = StyleSheet.create({
  grid:       {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm},
  slot:       {paddingVertical: spacing.sm + 2, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center'},
  slotActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  slotBooked: {backgroundColor: colors.background, borderColor: colors.border, opacity: 0.45},
  text:       {fontSize: 11, fontWeight: '600', color: colors.textPrimary},
  textActive: {color: '#fff'},
  textBooked: {textDecorationLine: 'line-through', color: colors.textMuted},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({children}) {
  return <Text style={sl.text}>{children}</Text>;
}
const sl = StyleSheet.create({
  text: {fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: spacing.lg, marginBottom: spacing.sm},
});

function LegendDot({color, label, strikethrough}) {
  return (
    <View style={ld.wrap}>
      <View style={[ld.dot, {backgroundColor: color, borderWidth: 1, borderColor: colors.border}]} />
      <Text style={[ld.label, strikethrough && {textDecorationLine: 'line-through'}]}>{label}</Text>
    </View>
  );
}
const ld = StyleSheet.create({
  wrap:  {flexDirection: 'row', alignItems: 'center', gap: 5},
  dot:   {width: 12, height: 12, borderRadius: 6},
  label: {fontSize: 11, color: colors.textMuted},
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   {flex: 1, backgroundColor: colors.background},

  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingTop: spacing['4xl'], paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  back:   {padding: 4},
  headerTitle: {fontSize: 18, fontWeight: '800', color: colors.textPrimary},

  scroll: {padding: spacing.base},

  docCard:      {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, ...shadows.sm},
  docAvatar:    {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
  docAvatarText:{fontSize: 15, fontWeight: '900'},
  docInfo:      {flex: 1},
  docName:      {fontSize: 14, fontWeight: '800', color: colors.textPrimary},
  docSpec:      {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  docFee:       {fontSize: 16, fontWeight: '900', color: colors.primary},

  visitRow:         {flexDirection: 'row', gap: spacing.sm},
  visitCard:        {flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 2, borderColor: colors.border, gap: 4, position: 'relative'},
  visitCardActive:  {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  visitEmoji:       {fontSize: 22},
  visitLabel:       {fontSize: 12, fontWeight: '700', color: colors.textSecondary},
  visitLabelActive: {color: colors.primary},
  visitFee:         {fontSize: 13, fontWeight: '800', color: colors.textPrimary},
  visitFeeActive:   {color: colors.primary},
  saveBadge:        {position: 'absolute', top: -8, right: -4, backgroundColor: colors.success, paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.full},
  saveBadgeText:    {fontSize: 8, fontWeight: '800', color: '#fff'},

  dateStrip:    {gap: spacing.sm, paddingBottom: spacing.xs},
  datePill:     {alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, minWidth: 58},
  datePillActive:{backgroundColor: colors.primary, borderColor: colors.primary},
  datePillDay:  {fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 3, textTransform: 'uppercase'},
  datePillNum:  {fontSize: 20, fontWeight: '900', color: colors.textPrimary},
  datePillMon:  {fontSize: 9, fontWeight: '600', color: colors.textMuted, marginTop: 2},
  datePillTextActive:{color: '#fff'},

  legend: {flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md},

  footer:             {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.base, paddingBottom: spacing['2xl'], borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.base},
  footerLeft:         {flex: 1},
  footerDateText:     {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  footerTimeText:     {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  footerPlaceholder:  {fontSize: 13, color: colors.textMuted},
  continueBtn:        {backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.base, borderRadius: radius.full},
  continueBtnDisabled:{backgroundColor: '#C4B5FD'},
  continueBtnText:    {color: '#fff', fontSize: 15, fontWeight: '800'},
});
