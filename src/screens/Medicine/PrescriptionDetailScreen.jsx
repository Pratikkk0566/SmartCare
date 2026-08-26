import React, {useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {computeMedicineRelevance, computePrescriptionRelevance} from '../../API/Api';
import {
  ArrowBackIcon, FileTextIcon, CalendarIcon,
  UserIcon, PillIcon, CapsuleIcon,
  AlertCircleIcon, CopyIcon, ChevronRightIcon,
  StethoscopeIcon, DocumentIcon, HospitalIcon, ClockIcon,
} from '../../assets/icons/Icons';

function formatDateDisplay(dateStr = '') {
  if (!dateStr) return '—';
  const s = String(dateStr).split(' ')[0];
  const parts = s.split('-');
  if (parts.length !== 3) return dateStr;
  let y, m, d;
  if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
  else if (parts[2].length === 4) { y = parts[2]; m = parts[1]; d = parts[0]; }
  else return dateStr;
  const mi = parseInt(m, 10);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[mi - 1] || ''} ${y}`;
}

export default function PrescriptionDetailScreen({route, navigation}) {
  const params = route?.params || {};
  const prescription = params.prescription || params;

  // ── Hooks MUST run BEFORE any early return ───────────────────────────────
  const meds = useMemo(
    () => (Array.isArray(prescription?.medicines) ? prescription.medicines : []),
    [prescription?.medicines]
  );
  const lastmod = prescription?.lastmodified || prescription?.date || '';
  const isServer = prescription?.source === 'server';

  const prescriptionRelevance = useMemo(() => {
    if (!prescription) return { level: 'unknown', activeCount: 0, expiringCount: 0, expiredCount: 0 };
    if (prescription.relevanceLevel) {
      return {
        level: prescription.relevanceLevel,
        activeCount: prescription.activeCount || 0,
        expiringCount: prescription.expiringCount || 0,
        expiredCount: prescription.expiredCount || 0,
      };
    }
    const r = computePrescriptionRelevance({
      medicines: meds,
      lastmodified: lastmod,
    });
    return {
      level: r.level,
      activeCount: r.activeCount,
      expiringCount: r.expiringCount,
      expiredCount: r.expiredCount,
    };
  }, [prescription, meds, lastmod]);

  const medicinesRelevance = useMemo(() => {
    if (!prescription) return [];
    if (Array.isArray(prescription.medicinesRelevance) && prescription.medicinesRelevance.length === meds.length) {
      return prescription.medicinesRelevance;
    }
    return meds.map(m => computeMedicineRelevance(m, lastmod));
  }, [prescription, meds, lastmod]);

  const dateDisplay = prescription
    ? (prescription.dateDisplay || formatDateDisplay(lastmod))
    : '—';
  const timeDisplay = prescription && lastmod
    ? (prescription.timeDisplay || String(lastmod).split(' ')[1]?.slice(0, 5) || '')
    : '';
  const doctorName = prescription?.doctorName || '';
  const prescId = prescription?.serverId || prescription?.id || '';

  const level = prescriptionRelevance.level;
  let recencyLabel = 'Prescription';
  let recencyBg = colors.primaryLight;
  let recencyFg = colors.primary;
  if (level === 'active') {
    const n = prescriptionRelevance.activeCount || 0;
    recencyLabel = n > 0 ? `Active · ${n} med${n !== 1 ? 's' : ''}` : 'Active';
    recencyBg = '#D1FAE5';
    recencyFg = '#047857';
  } else if (level === 'expiring') {
    const n = prescriptionRelevance.expiringCount || 1;
    recencyLabel = `Finishing · ${n}`;
    recencyBg = '#FEF3C7';
    recencyFg = '#B45309';
  } else if (level === 'expired') {
    recencyLabel = 'Expired';
    recencyBg = '#F3F4F6';
    recencyFg = '#6B7280';
  }

  // Safety: if no prescription provided, bail back (hooks done first)
  if (!prescription || (!prescription.medicines && !prescription.id)) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <AlertCircleIcon size={42} color={colors.error} />
          <Text style={styles.errorText}>Prescription details unavailable</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.errorBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Prescription Details</Text>
            <Text style={styles.headerSub}>#{prescId}</Text>
          </View>
          <View style={[styles.recencyChip, {backgroundColor: recencyBg}]}>
            <Text style={[styles.recencyChipText, {color: recencyFg}]}>{recencyLabel}</Text>
          </View>
        </View>

        {/* Doctor & Hospital Info Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorTop}>
            <View style={styles.doctorAvatar}>
              <StethoscopeIcon size={22} color={colors.primary} />
            </View>
            <View style={styles.doctorMain}>
              <Text style={styles.doctorName}>
                {doctorName ? (doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`) : (prescription?.department ? `Specialist (${prescription.department})` : 'Hospital / Attending Doctor')}
              </Text>
              {(prescription?.department || prescription?.qualifications) ? (
                <Text style={styles.doctorSpecialty}>
                  {prescription.department}{prescription.qualifications ? ` • ${prescription.qualifications}` : ''}
                </Text>
              ) : (
                <Text style={styles.doctorSpecialty}>SmartCare Healthcare</Text>
              )}
            </View>
          </View>

          {/* Quick Meta Grid */}
          <View style={styles.metaRowWrap}>
            <View style={styles.metaBox}>
              <View style={styles.metaBoxIcon}>
                <CalendarIcon size={14} color={colors.primary} />
              </View>
              <View style={styles.metaBoxText}>
                <Text style={styles.metaBoxLabel}>Date Issued</Text>
                <Text style={styles.metaBoxVal}>{dateDisplay}{timeDisplay ? ` · ${timeDisplay}` : ''}</Text>
              </View>
            </View>

            <View style={styles.metaBox}>
              <View style={styles.metaBoxIcon}>
                <DocumentIcon size={14} color={colors.primary} />
              </View>
              <View style={styles.metaBoxText}>
                <Text style={styles.metaBoxLabel}>Prescription ID</Text>
                <Text style={styles.metaBoxVal} selectable>#{prescId}</Text>
              </View>
            </View>
          </View>

          {prescription?.diagnosis ? (
            <View style={styles.diagnosisBox}>
              <AlertCircleIcon size={15} color="#0369A1" />
              <View style={styles.diagnosisBody}>
                <Text style={styles.diagnosisLabel}>Diagnosis</Text>
                <Text style={styles.diagnosisVal}>{prescription.diagnosis}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Medicines Section */}
        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <PillIcon size={16} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Prescribed Medicines ({meds.length})</Text>
        </View>

        {meds.length === 0 ? (
          <View style={styles.emptyMeds}>
            <CapsuleIcon size={36} color={colors.textMuted} />
            <Text style={styles.emptyMedsTitle}>No medicines to display</Text>
            <Text style={styles.emptyMedsSub}>Details may not be available for this prescription.</Text>
          </View>
        ) : (
          meds.map((med, idx) => {
            const name = med.drug || med.medicineName || med.name || `Medicine ${idx + 1}`;
            const generic = med.genericname && med.genericname !== 'GEN' ? med.genericname : '';
            const dose = med.dose || '';
            const frequency = med.frequencyNote || med.frequency || med.whentoeat || '';
            const duration = med.duration || '';
            const durType = med.priscdurationtype || '';
            const durationDisplay = [duration, durType].filter(Boolean).join(' ');
            const qty = med.qty != null
              ? Number(med.qty).toFixed(Number.isInteger(Number(med.qty)) ? 0 : 1)
              : '';
            const medRoute = med.routes || med.route || '';
            const remark = med.remark || '';
            const medicineId = med.medicineid || med.id || '';

            // Per-medicine relevance
            const medRel = medicinesRelevance[idx] || { status: 'unknown', days: Infinity, expiryDate: '' };
            const medStatus = medRel.status;
            const isExpired = medStatus === 'expired';
            const isExpiring = medStatus === 'expiring';
            const isActive = medStatus === 'active';

            let medChipBg = '#EEF2FF';
            let medChipFg = '#4F46E5';
            let medChipLabel = '—';
            if (isActive) {
              medChipBg = '#D1FAE5'; medChipFg = '#047857';
              medChipLabel = isFinite(medRel.days) ? (medRel.days <= 7 ? `${medRel.days}d left` : 'Active') : 'Ongoing';
            } else if (isExpiring) {
              medChipBg = '#FEF3C7'; medChipFg = '#B45309';
              const past = Math.abs(medRel.days || 0);
              medChipLabel = past <= 7 ? `Ending · ${past}d` : 'Finishing';
            } else if (isExpired) {
              medChipBg = '#F3F4F6'; medChipFg = '#6B7280';
              const past = Math.abs(medRel.days || 0);
              medChipLabel = `${past}d ago`;
            }

            const localDose = med.dose && med.unit ? `${med.dose} ${med.unit}` : '';
            const localTimes = Array.isArray(med.times) && med.times.length > 0
              ? `${med.times.length}x daily · ${med.times.join(', ')}`
              : '';
            const localFallback = [localDose, localTimes].filter(Boolean).join(' · ');

            return (
              <View
                key={med.id || med.medicineid || idx}
                style={[
                  styles.medCard,
                  isExpired && styles.medCardExpired,
                ]}
              >
                {/* Header */}
                <View style={styles.medHead}>
                  <Text style={[
                    styles.medIndex,
                    isExpired && styles.medIndexExpired,
                  ]}>
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </Text>
                  <View style={styles.medHeadText}>
                    <Text style={[
                      styles.medName,
                      isExpired && styles.medNameExpired,
                    ]}>
                      {name}
                    </Text>
                    {generic ? (
                      <Text style={[
                        styles.medGeneric,
                        isExpired && { color: '#9CA3AF' },
                      ]}>
                        {generic}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.medStatusChip, { backgroundColor: medChipBg }]}>
                    <Text style={[styles.medStatusChipText, { color: medChipFg }]}>
                      {medChipLabel}
                    </Text>
                  </View>
                </View>

                {/* Structured Details Grid (NO strength field) */}
                <View style={[styles.medPillsGrid, isExpired && { opacity: 0.8 }]}>
                  {isServer ? (
                    <>
                      {dose ? (
                        <View style={styles.pillItem}>
                          <Text style={styles.pillKey}>Dose</Text>
                          <Text style={styles.pillVal}>{dose}</Text>
                        </View>
                      ) : null}

                      {frequency ? (
                        <View style={styles.pillItem}>
                          <Text style={styles.pillKey}>When / Timing</Text>
                          <Text style={styles.pillVal}>{frequency}</Text>
                        </View>
                      ) : null}

                      {durationDisplay ? (
                        <View style={styles.pillItem}>
                          <Text style={styles.pillKey}>Duration</Text>
                          <Text style={styles.pillVal}>{durationDisplay}</Text>
                        </View>
                      ) : null}

                      {medRel.expiryDate ? (
                        <View style={styles.pillItem}>
                          <Text style={styles.pillKey}>Valid Until</Text>
                          <Text style={[
                            styles.pillVal,
                            isExpiring && { color: '#B45309', fontWeight: '700' },
                            isExpired && { color: '#6B7280' },
                          ]}>
                            {formatDateDisplay(medRel.expiryDate)}
                          </Text>
                        </View>
                      ) : null}

                      {medRoute ? (
                        <View style={styles.pillItem}>
                          <Text style={styles.pillKey}>Route</Text>
                          <Text style={styles.pillVal}>{medRoute}</Text>
                        </View>
                      ) : null}

                      {qty ? (
                        <View style={styles.pillItem}>
                          <Text style={styles.pillKey}>Quantity</Text>
                          <Text style={styles.pillVal}>{qty}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.pillItemFull}>
                      <Text style={styles.pillKey}>Schedule</Text>
                      <Text style={styles.pillVal}>{localFallback || '—'}</Text>
                    </View>
                  )}
                </View>

                {/* Note / Instruction */}
                {remark ? (
                  <View style={styles.remarkCard}>
                    <AlertCircleIcon size={14} color="#A16207" />
                    <Text style={styles.remarkText}>{remark}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {/* Alarm & Schedule Engine Integration Card */}
        <View style={styles.engineCard}>
          <View style={styles.engineCardTop}>
            <View style={styles.engineIconWrap}>
              <ClockIcon size={20} color={colors.primary} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.engineTitle}>Automatic Alarm Scheduling</Text>
              <Text style={styles.engineSubtitle}>
                Deterministic daily morning, afternoon, and night alarms generated for these medicines.
              </Text>
            </View>
          </View>
          <View style={styles.engineBtnRow}>
            <TouchableOpacity
              style={styles.enginePrimaryBtn}
              onPress={() => navigation.navigate('MedicineSchedule')}>
              <CalendarIcon size={16} color="#fff" />
              <Text style={styles.enginePrimaryBtnText}>View in Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.engineSecondaryBtn}
              onPress={() => navigation.navigate('MedicationAlarms')}>
              <ClockIcon size={16} color={colors.primary} />
              <Text style={styles.engineSecondaryBtnText}>Alarm Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Source info */}
        <View style={styles.sourceStamp}>
          <Text style={styles.sourceStampText}>
            {isServer ? 'Source: SmartCare Hospital EHR' : 'Source: Saved offline'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  back: {padding: 4},
  headerTitleWrap: {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  headerSub:   {fontSize: 12, color: colors.textMuted, marginTop: 1, fontWeight: '600'},
  recencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  recencyChipText: {fontSize: 11, fontWeight: '800', letterSpacing: 0.2},

  // Doctor Card
  doctorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  doctorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorMain: {flex: 1},
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metaRowWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  metaBoxIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBoxText: {flex: 1},
  metaBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  metaBoxVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },

  diagnosisBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  diagnosisBody: {flex: 1},
  diagnosisLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#0284C7',
    letterSpacing: 0.4,
  },
  diagnosisVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginTop: 1,
  },

  // Section Header
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  emptyMeds: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  emptyMedsTitle: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  emptyMedsSub:   {fontSize: 12, color: colors.textMuted},

  // Medicine Card
  medCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  medCardExpired: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E5E7EB',
    opacity: 0.9,
  },
  medHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  medIndex: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 26,
    overflow: 'hidden',
  },
  medIndexExpired: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
  },
  medHeadText: {flex: 1},
  medName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  medNameExpired: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  medGeneric: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 1,
  },
  medStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  medStatusChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Pills Grid
  medPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: radius.md,
  },
  pillItem: {
    minWidth: '45%',
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillItemFull: {
    width: '100%',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillKey: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.textMuted,
    marginBottom: 2,
  },
  pillVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 16,
  },

  remarkCard: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#FEF9C3',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  remarkText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#A16207',
    lineHeight: 16,
  },

  sourceStamp: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  sourceStampText: {fontSize: 11, color: colors.textMuted, fontWeight: '600'},

  // Engine Card
  engineCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: radius.lg,
    padding: spacing.base,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  engineCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  engineIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  engineSubtitle: {
    fontSize: 12,
    color: '#0284C7',
    marginTop: 2,
    lineHeight: 16,
  },
  engineBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  enginePrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
  },
  enginePrimaryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  engineSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  engineSecondaryBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {fontSize: 14, color: colors.textSecondary, fontWeight: '600'},
  errorBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  errorBtnText: {color: colors.white, fontWeight: '700'},
});
