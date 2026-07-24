import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {
  ArrowBackIcon, ArrowLeftIcon, ArrowRightIcon,
  ClockIcon, HomeDeliveryIcon, PinIcon,
} from '../../assets/icons/Icons';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '04:00 PM', '06:00 PM'];

// ─── Step Bar ────────────────────────────────────────────────────────────────
function StepBar({current}) {
  const steps = ['Select Test', 'Hospital', 'Date & Time', 'Confirmed'];
  return (
    <View style={sb.row}>
      {steps.map((label, i) => {
        const n    = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={n}>
            <View style={sb.stepWrap}>
              <View style={[sb.circle, active && sb.circleActive, done && sb.circleDone]}>
                <Text style={[sb.num, (active || done) && sb.numActive]}>
                  {done ? '✓' : n}
                </Text>
              </View>
              <Text style={[sb.label, active && sb.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[sb.line, done && sb.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stepWrap: {alignItems: 'center', width: 56},
  circle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 3,
  },
  circleActive: {borderColor: colors.primary, backgroundColor: colors.primary},
  circleDone:  {borderColor: colors.success,  backgroundColor: colors.success},
  num:       {fontSize: 10, fontWeight: '800', color: colors.textMuted},
  numActive: {color: '#fff'},
  label:      {fontSize: 9, color: colors.textMuted,  fontWeight: '500', textAlign: 'center'},
  labelActive:{fontSize: 9, color: colors.primary, fontWeight: '700', textAlign: 'center'},
  line:     {flex: 1, height: 2, backgroundColor: colors.border,  marginTop: 11},
  lineDone: {flex: 1, height: 2, backgroundColor: colors.success, marginTop: 11},
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SelectDateTimeScreen({navigation, route}) {
  const {test, centre} = route.params;
  const {bookTestRequest} = useApp();

  const today = new Date();

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [collectionType, setCollectionType] = useState('hospital'); // 'hospital' | 'home'

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();

  const calCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);       // empty leading cells
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth, firstDay, daysInMonth]);

  const isPast = day => {
    if (!day) return true;
    const cell = new Date(viewYear, viewMonth, day);
    const now  = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cell < now;
  };

  const isNowMonth =
    viewYear  === today.getFullYear() &&
    viewMonth === today.getMonth();

  const prevMonth = () => {
    if (isNowMonth) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return null;
    return new Date(viewYear, viewMonth, selectedDate)
      .toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
  };

  // ── Confirm booking ───────────────────────────────────────────────────────
  const canConfirm = selectedDate !== null && selectedTime !== null;

  const handleConfirm = () => {
    const bookingData = {
      testName:         test.name,
      testEmoji:        test.emoji,
      testPrice:        test.price,
      testBg:           test.bg,
      sampleType:       test.sampleType,
      sampleInstructions: test.sampleInstructions,
      preparation:      test.preparation,
      reportTime:       test.reportTime,
      hospitalName:     centre.name,
      hospitalAddress:  centre.address,
      date:             formatSelectedDate(),
      time:             selectedTime,
      collectionType,
    };
    const confirmed = bookTestRequest(bookingData);
    navigation.replace('BookingConfirmed', {booking: confirmed});
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StepBar current={3} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Date & Time</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Test + Hospital Summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.summaryEmoji, {backgroundColor: test.bg}]}>
            <Text style={styles.summaryEmojiText}>{test.emoji}</Text>
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTest}>{test.name}</Text>
            <Text style={styles.summaryHosp}>{centre.name}</Text>
            <Text style={styles.summaryAddr} numberOfLines={2}>
              {centre.address}
            </Text>
          </View>
          <Text style={styles.summaryPrice}>₹{test.price}</Text>
        </View>

        {/* ── Calendar ── */}
        <View style={styles.card}>
          {/* Month navigation */}
          <View style={styles.calHeader}>
            <TouchableOpacity
              onPress={prevMonth}
              style={[styles.navBtn, isNowMonth && styles.navBtnDisabled]}
              disabled={isNowMonth}>
              <ArrowLeftIcon size={18} color={isNowMonth ? colors.border : colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.calMonthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <ArrowRightIcon size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.dayRow}>
            {DAYS.map(d => (
              <Text key={d} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Date grid */}
          <View style={styles.grid}>
            {calCells.map((day, idx) => {
              const past    = isPast(day);
              const isToday =
                day &&
                viewYear  === today.getFullYear() &&
                viewMonth === today.getMonth() &&
                day === today.getDate();
              const sel = day && selectedDate === day;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    !day  && styles.cellEmpty,
                    isToday && styles.cellToday,
                    sel     && styles.cellSelected,
                    past    && styles.cellPast,
                  ]}
                  onPress={() => { if (day && !past) setSelectedDate(day); }}
                  disabled={!day || past}
                  activeOpacity={0.7}>
                  {day ? (
                    <Text style={[
                      styles.cellText,
                      isToday && styles.cellTextToday,
                      sel     && styles.cellTextSelected,
                      past    && styles.cellTextPast,
                    ]}>
                      {day}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Time Slots ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ClockIcon size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Select Time</Text>
          </View>
          <View style={styles.timesRow}>
            {TIME_SLOTS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, selectedTime === t && styles.timeChipSelected]}
                onPress={() => setSelectedTime(t)}
                activeOpacity={0.8}>
                <Text style={[
                  styles.timeChipText,
                  selectedTime === t && styles.timeChipTextSelected,
                ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Sample Collection Type ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <PinIcon size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Sample Collection</Text>
          </View>

          {/* Visit Hospital option */}
          <TouchableOpacity
            style={[
              styles.collectionOption,
              collectionType === 'hospital' && styles.collectionOptionSelected,
            ]}
            onPress={() => setCollectionType('hospital')}
            activeOpacity={0.8}>
            <PinIcon
              size={18}
              color={collectionType === 'hospital' ? colors.primary : colors.textMuted}
            />
            <View style={styles.collectionInfo}>
              <Text style={[
                styles.collectionTitle,
                collectionType === 'hospital' && styles.collectionTitleSelected,
              ]}>
                Visit Hospital
              </Text>
              <Text style={styles.collectionSub}>
                Collect sample at {centre.name}
              </Text>
            </View>
            <View style={[styles.radio, collectionType === 'hospital' && styles.radioSelected]}>
              {collectionType === 'hospital' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Home Collection option — only if centre supports it */}
          {centre.homeCollection && (
            <TouchableOpacity
              style={[
                styles.collectionOption,
                collectionType === 'home' && styles.collectionOptionSelected,
              ]}
              onPress={() => setCollectionType('home')}
              activeOpacity={0.8}>
              <HomeDeliveryIcon
                size={18}
                color={collectionType === 'home' ? colors.primary : colors.textMuted}
              />
              <View style={styles.collectionInfo}>
                <Text style={[
                  styles.collectionTitle,
                  collectionType === 'home' && styles.collectionTitleSelected,
                ]}>
                  Home Collection
                  {centre.homeCollectionCharge === 0
                    ? ' · Free'
                    : ` · +₹${centre.homeCollectionCharge}`}
                </Text>
                <Text style={styles.collectionSub}>
                  Trained technician visits your address
                </Text>
              </View>
              <View style={[styles.radio, collectionType === 'home' && styles.radioSelected]}>
                {collectionType === 'home' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* ── Sticky Footer ── */}
      <View style={styles.footer}>
        {canConfirm ? (
          <Text style={styles.footerSummary}>
            📅 {formatSelectedDate()}  ·  ⏰ {selectedTime}
          </Text>
        ) : (
          <Text style={styles.footerHint}>
            Select a date and time to continue
          </Text>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
          activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>Confirm Booking →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  back: {padding: 4},
  headerTitle: {fontSize: 17, fontWeight: '700', color: colors.textPrimary},

  scroll: {padding: spacing.base, paddingBottom: 16},

  // Summary card
  summaryCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadows.sm,
    marginBottom: spacing.base, gap: spacing.md,
  },
  summaryEmoji: {
    width: 44, height: 44, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryEmojiText: {fontSize: 24},
  summaryInfo:  {flex: 1},
  summaryTest:  {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  summaryHosp:  {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  summaryAddr:  {fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 15},
  summaryPrice: {fontSize: 16, fontWeight: '800', color: colors.primary},

  // Generic card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.base, ...shadows.sm, marginBottom: spacing.base,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.md,
  },
  cardTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary},

  // Calendar
  calHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  navBtn:         {padding: 6, borderRadius: radius.sm, backgroundColor: colors.background},
  navBtnDisabled: {opacity: 0.3},
  calMonthLabel:  {fontSize: 15, fontWeight: '700', color: colors.textPrimary},

  dayRow:   {flexDirection: 'row', marginBottom: spacing.sm},
  dayLabel: {flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted},

  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  cell: {
    width: '14.285%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, marginVertical: 1,
  },
  cellEmpty:    {opacity: 0},
  cellToday:    {borderWidth: 1.5, borderColor: colors.primary},
  cellSelected: {backgroundColor: colors.primary},
  cellPast:     {opacity: 0.3},
  cellText:         {fontSize: 13, color: colors.textPrimary, fontWeight: '500'},
  cellTextToday:    {color: colors.primary, fontWeight: '800'},
  cellTextSelected: {color: '#fff', fontWeight: '800'},
  cellTextPast:     {color: colors.textMuted},

  // Time slots
  timesRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  timeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  timeChipSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  timeChipText:         {fontSize: 13, color: colors.textSecondary, fontWeight: '600'},
  timeChipTextSelected: {color: '#fff', fontWeight: '700'},

  // Collection type
  collectionOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, marginBottom: spacing.sm,
  },
  collectionOptionSelected: {
    borderColor: colors.primary, backgroundColor: colors.primaryLight,
  },
  collectionInfo: {flex: 1},
  collectionTitle: {fontSize: 13, fontWeight: '600', color: colors.textPrimary},
  collectionTitleSelected: {color: colors.primary},
  collectionSub: {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: {borderColor: colors.primary},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary},

  // Footer
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.base,
  },
  footerSummary: {
    fontSize: 13, color: colors.textSecondary,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  footerHint: {
    fontSize: 12, color: colors.textMuted,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center', ...shadows.md,
  },
  confirmBtnDisabled: {opacity: 0.4},
  confirmBtnText: {color: '#fff', fontWeight: '800', fontSize: 16},
});