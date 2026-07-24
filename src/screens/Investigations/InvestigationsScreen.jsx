import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {medicalReports} from '../../data/mockData';
import {useApp} from '../../context/AppContext';
import SearchBar from '../../components/common/SearchBar';
import StatusChip from '../../components/common/StatusChip';
import {
  ArrowBackIcon, FilterIcon, ShieldIcon, FlaskIcon,
  PlusIcon, ClockIcon, CheckCircleIcon, ArrowRightIcon,
} from '../../assets/icons/Icons';

const FILTERS = ['All', 'Blood Test', 'Urine Test', 'Imaging', 'Others'];

const CATEGORY_MAP = {
  'Blood Test': ['Complete Blood Count (CBC)', 'Liver Function Test (LFT)', 'HbA1c (Glycated Hemoglobin)'],
  'Urine Test': ['Urine Routine Analysis'],
  'Imaging': ['Chest X-Ray'],
};

const STATUS_ICON = {
  Approved: CheckCircleIcon,
  Pending: ClockIcon,
};

export default function InvestigationsScreen({navigation}) {
  const {testRequests} = useApp();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  const filteredReports = medicalReports.filter(r => {
    const matchQuery = query ? r.name.toLowerCase().includes(query.toLowerCase()) : true;
    if (!matchQuery) return false;
    if (filter === 'All') return true;
    if (filter === 'Others') return !Object.values(CATEGORY_MAP).flat().includes(r.name);
    return (CATEGORY_MAP[filter] || []).includes(r.name);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Investigations</Text>
            <Text style={styles.headerSub}>Book tests & view your medical reports.</Text>
          </View>
          <FilterIcon size={22} color={colors.textSecondary} />
        </View>

        {/* Book a Test Banner */}
        <TouchableOpacity
          style={styles.bookBanner}
          onPress={() => navigation.navigate('InvestigationRequest')}
          activeOpacity={0.85}>
          <View style={styles.bookBannerLeft}>
            <Text style={styles.bookBannerLabel}>BOOK A TEST</Text>
            <Text style={styles.bookBannerTitle}>Find & Book Medical Tests</Text>
            <Text style={styles.bookBannerSub}>Compare labs · Instant approval · Home collection available</Text>
            <View style={styles.bookBtn}>
              <PlusIcon size={14} color="#fff" />
              <Text style={styles.bookBtnText}>Request a Test</Text>
            </View>
          </View>
          <View style={styles.bookBannerRight}>
            <FlaskIcon size={56} color={colors.primaryLight} />
          </View>
        </TouchableOpacity>

        {/* My Test Requests */}
        {testRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Test Requests</Text>
            {testRequests.slice(0, 3).map(req => {
              const IconComp = STATUS_ICON[req.status] || ClockIcon;
              return (
                <View key={req.id} style={styles.requestCard}>
                  <View style={[styles.requestIconWrap, {backgroundColor: req.status === 'Approved' ? colors.successLight : colors.warningLight}]}>
                    <IconComp size={20} color={req.status === 'Approved' ? colors.success : colors.warning} />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName} numberOfLines={1}>{req.testName}</Text>
                    <Text style={styles.requestMeta}>{req.hospitalName} · {req.date}</Text>
                    <Text style={styles.requestMeta}>{req.collectionType === 'home' ? '🏠 Home Collection' : '🏥 Visit Hospital'} · {req.time}</Text>
                  </View>
                  <StatusChip status={req.status === 'Approved' ? 'completed' : 'pending'} label={req.status} size="xs" />
                </View>
              );
            })}
          </View>
        )}

        {/* Search */}
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by test name or date" style={styles.search} />

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipSelected]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, filter === f && styles.chipTextSelected]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Recent Reports</Text>

        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No reports found for this filter.</Text>
          </View>
        ) : (
          filteredReports.map(r => (
            <TouchableOpacity key={r.id} style={styles.reportCard} onPress={() => navigation.navigate('InvestigationReport', {report: r})} activeOpacity={0.8}>
              <View style={[styles.reportIcon, {backgroundColor: r.iconBg}]}>
                <Text style={styles.reportEmoji}>{r.category === 'Blood Test' ? '🩸' : r.category === 'Urine Test' ? '🧪' : r.category === 'Imaging' ? '🫁' : '📋'}</Text>
              </View>
              <View style={styles.reportInfo}>
                <View style={styles.reportTopRow}>
                  <Text style={styles.reportName} numberOfLines={1}>{r.name}</Text>
                  <StatusChip status={r.status} size="xs" />
                </View>
                <Text style={styles.reportCat}>{r.category}</Text>
                <Text style={styles.reportDate}>{r.date} • {r.time}</Text>
                <Text style={styles.reportLoc}>{r.location}</Text>
              </View>
              <ArrowRightIcon size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}

        {/* Help Card */}
        <View style={styles.helpCard}>
          <View style={[styles.helpIcon, {backgroundColor: colors.primaryLight}]}>
            <ShieldIcon size={24} color={colors.primary} />
          </View>
          <View style={styles.helpInfo}>
            <Text style={styles.helpTitle}>Need Help Understanding Your Report?</Text>
            <Text style={styles.helpSub}>Our doctors are here to help you understand your test results.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.base},
  back: {padding: 4, marginTop: 2},
  headerCenter: {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  headerSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  bookBanner: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.base,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    ...shadows.md,
  },
  bookBannerLeft: {flex: 1},
  bookBannerLabel: {fontSize: 10, fontWeight: '800', color: colors.primaryLight, letterSpacing: 1.5, marginBottom: 4},
  bookBannerTitle: {fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4},
  bookBannerSub: {fontSize: 11, color: colors.primaryLight, lineHeight: 16, marginBottom: spacing.md},
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start',
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  bookBtnText: {color: '#fff', fontWeight: '700', fontSize: 13},
  bookBannerRight: {opacity: 0.3, marginLeft: spacing.sm},

  section: {marginBottom: spacing.base},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},

  requestCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md,
  },
  requestIconWrap: {width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  requestInfo: {flex: 1},
  requestName: {fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2},
  requestMeta: {fontSize: 11, color: colors.textSecondary},

  search: {marginBottom: spacing.base},
  filters: {gap: spacing.sm, paddingBottom: spacing.base},
  chip: {paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface},
  chipSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: 13, color: colors.textSecondary, fontWeight: '500'},
  chipTextSelected: {color: '#fff', fontWeight: '700'},

  emptyState: {alignItems: 'center', paddingVertical: spacing['3xl']},
  emptyText: {fontSize: 14, color: colors.textMuted},
  reportCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md},
  reportIcon: {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  reportEmoji: {fontSize: 24},
  reportInfo: {flex: 1},
  reportTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2},
  reportName: {fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: spacing.sm},
  reportCat: {fontSize: 11, color: colors.textMuted, marginBottom: 2},
  reportDate: {fontSize: 12, color: colors.textSecondary},
  reportLoc: {fontSize: 12, color: colors.textSecondary},

  helpCard: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, gap: spacing.md, marginTop: spacing.sm},
  helpIcon: {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  helpInfo: {flex: 1},
  helpTitle: {fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4},
  helpSub: {fontSize: 12, color: colors.textSecondary},
});