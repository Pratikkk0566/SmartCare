import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal, Pressable} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {InvestigationApi} from '../../API/Api';
import {enrichInvestigationsWithDates} from '../../utils/investigationEnrichment';
import SearchBar from '../../components/common/SearchBar';
import StatusChip from '../../components/common/StatusChip';
// ── SQLITE INTEGRATION ──────────────────────────────────────────────────────
import { useSQLiteData } from '../../hooks/useSQLiteData';
// ────────────────────────────────────────────────────────────────────────────
import {
  ArrowBackIcon, FilterIcon, ShieldIcon, FlaskIcon,
  PlusIcon, ClockIcon, CheckCircleIcon, ArrowRightIcon,
  BloodDropIcon, BeakerIcon, LungsIcon, ClipboardIcon, HomeDeliveryIcon, HospitalBuildingIcon,
  CalendarIcon,
} from '../../assets/icons/Icons';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const FILTERS = ['All', 'Blood Test', 'Urine Test', 'Imaging', 'Others'];
const DATE_FILTERS = ['All Time', 'Past Week', 'Past Month', 'Past 3 Months', 'Past 6 Months'];

const STATUS_ICON = {
  Approved: CheckCircleIcon,
  Pending: ClockIcon,
};

// Derive category from investigation name keywords
function deriveCategory(name = '') {
  const n = name.toLowerCase();
  if (n.includes('blood') || n.includes('cbc') || n.includes('lft') || n.includes('hba1c') ||
      n.includes('lipid') || n.includes('thyroid') || n.includes('haemoglobin')) return 'Blood Test';
  if (n.includes('urine') || n.includes('biopsy')) return 'Urine Test';
  if (n.includes('x-ray') || n.includes('xray') || n.includes('mri') || n.includes('ct scan') ||
      n.includes('ultrasound') || n.includes('ecg') || n.includes('echo')) return 'Imaging';
  return 'Others';
}

// Fetch ALL investigations from the very beginning (year 2000) to today end of day
const FROM_DATE = '2000-01-01 00:00:00';
function getToDate() { 
  return new Date().toISOString().split('T')[0] + ' 23:59:59';
}

// Parse any date string to a comparable timestamp (returns 0 on failure)
function toTimestamp(dateStr = '') {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return isNaN(t) ? 0 : t;
}

// ─── Robust value extraction (HIS endpoints use wildly inconsistent key names)
function pick(obj, keys, fallback = '') {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

// Split combined datetime string "2024-05-15T09:30:00" or "2024-05-15 09:30" into {date, time}
function splitDateTime(dt = '') {
  if (!dt) return {date: '', time: ''};
  const s = String(dt).trim();
  // ISO with T
  if (s.includes('T')) {
    const [d, t] = s.split('T');
    return {date: d || '', time: (t || '').slice(0, 5)};
  }
  // Space separated
  if (s.includes(' ')) {
    const [d, t] = s.split(' ');
    return {date: d || '', time: (t || '').slice(0, 5)};
  }
  return {date: s, time: ''};
}

export default function InvestigationsScreen({navigation}) {
  const {testRequests, isOnline, refreshAllData, appReady, userProfile} = useApp();
  
  // ── SQLITE INTEGRATION ──────────────────────────────────────────────────
  const {
    getInvestigations,
    saveInvestigations,
    searchInvestigations,
    getInvestigationsByCategory,
    getInvestigationsByDateRange,
    getProfile,
    isInitialized,
  } = useSQLiteData();
  // ────────────────────────────────────────────────────────────────────────
  
  const [filter, setFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [query, setQuery] = useState('');
  const [reports, setReports] = useState([]);
  
  // Show loading while SQLite is initializing
  const [loading, setLoading] = useState(!isInitialized);
  const [refreshing, setRefreshing] = useState(false);

  // Load investigations from SQLite on screen focus
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      
      async function loadInvestigations() {
        try {
          if (!isInitialized) {
            console.log('[InvestigationsScreen] SQLite not initialized yet');
            return;
          }
          
          if (!mounted) return;
          
          console.log('[InvestigationsScreen] 🔄 Starting to load investigations...');
          
          // Try to get from SQLite first
          const patientId = userProfile?.patientId || userProfile?.patient_id || userProfile?.uhid;
          const cachedInvestigations = await getInvestigations(patientId);
          console.log('[InvestigationsScreen] 📦 Found', cachedInvestigations?.length || 0, 'cached investigations');
          
          if (cachedInvestigations && cachedInvestigations.length > 0) {
            if (!mounted) return;
            console.log('[InvestigationsScreen] ✅ OFFLINE MODE: Using cached data (', cachedInvestigations.length, 'investigations)');
            setReports(cachedInvestigations);
            setLoading(false);
          } else {
            // No cached data, try to fetch from API if we have patient ID
            const patientId = userProfile?.patientId || userProfile?.patient_id || userProfile?.uhid;
            if (patientId) {
              console.log('[InvestigationsScreen] 🌐 No cached data, trying to fetch from API for patient:', patientId);
              if (!mounted) return;
              setLoading(true);
              
              try {
                await fetchReports();
              } catch (error) {
                console.log('[InvestigationsScreen] ❌ API failed (no internet), but no cached data available');
                console.log('[InvestigationsScreen] 📱 User needs internet connection for first-time setup');
                if (!mounted) return;
                setLoading(false);
                // Show message to user that they need internet for first setup
              }
            } else {
              console.log('[InvestigationsScreen] ⚠️ No patient ID available, cannot fetch from API');
              if (!mounted) return;
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('[InvestigationsScreen] ❌ ERROR in loadInvestigations:', error);
          if (mounted) setLoading(false);
        }
      }
      
      loadInvestigations();
      
      return () => {
        mounted = false;
      };
    }, [isInitialized, userProfile?.patientId])  // Add userProfile.patientId dependency
  );

  // Update loading state based on SQLite status
  useEffect(() => {
    setLoading(!isInitialized);
  }, [isInitialized]);

  // Full re-fetch — only called on explicit pull-to-refresh
  const fetchReports = async () => {
    setRefreshing(true);
    
    try {
      // Get patient ID from AppContext userProfile
      console.log('[InvestigationsScreen] Using userProfile:', JSON.stringify(userProfile, null, 2));
      
      // Try different possible patient ID fields
      const patientId = userProfile?.patientId || userProfile?.patient_id || userProfile?.uhid || userProfile?.id;
      console.log('[InvestigationsScreen] Resolved patient ID:', patientId);
      
      if (!patientId) { 
        console.log('[InvestigationsScreen] ❌ No patient ID found in userProfile');
        setRefreshing(false); 
        setLoading(false); 
        return; 
      }
      
      console.log('[InvestigationsScreen] 🚀 Fetching investigations for patient:', patientId);
      const result = await InvestigationApi.getAll(patientId, FROM_DATE, getToDate());
      console.log('[InvestigationsScreen] API Result:', {
        success: result.success,
        dataType: typeof result.data,
        dataKeys: result.data ? Object.keys(result.data) : 'no data'
      });
      
      if (result.success) {
        console.log('[InvestigationsScreen] 📋 API returned successful response');
        console.log('[InvestigationsScreen] Raw result.data:', JSON.stringify(result.data, null, 2));
        
        let raw = [];
        if (Array.isArray(result.data)) {
          raw = result.data;
          console.log('[InvestigationsScreen] ✅ Found array directly in result.data');
        } else if (Array.isArray(result.data?.reports)) {
          raw = result.data.reports;
          console.log('[InvestigationsScreen] ✅ Found array in result.data.reports');
        } else if (Array.isArray(result.data?.data)) {
          raw = result.data.data;
          console.log('[InvestigationsScreen] ✅ Found array in result.data.data');
        } else if (Array.isArray(result.data?.list)) {
          raw = result.data.list;
          console.log('[InvestigationsScreen] ✅ Found array in result.data.list');
        } else if (result.data && typeof result.data === 'object') {
          console.log('[InvestigationsScreen] 🔍 Searching for arrays in result.data object...');
          for (const [key, value] of Object.entries(result.data)) {
            if (Array.isArray(value)) { 
              raw = value; 
              console.log('[InvestigationsScreen] ✅ Found array in result.data.' + key);
              break; 
            }
          }
        }
        
        console.log('[InvestigationsScreen] 📊 Processing', raw.length, 'raw investigation records');
        
        if (raw.length === 0) {
          console.log('[InvestigationsScreen] ⚠️ No investigation data found in API response');
          setReports([]);
          setRefreshing(false);
          setLoading(false);
          return;
        }
        
        const mapped = raw.map((r, i) => {
          // Log the entire raw object for the first item to see all available fields
          if (i === 0) {
            console.log('[Investigation RAW OBJECT]:', JSON.stringify(r, null, 2));
          }
        
        const name = pick(r, [
          'investigationName', 'investigation_name', 'testname', 'testName',
          'servicename', 'serviceName', 'reportName', 'itemname', 'itemName',
          'description', 'name', 'investigation', 'procedure', 'procedureName',
        ], 'Investigation');
        
        // Try to extract combined datetime first
        const combinedDT = pick(r, [
          'datetime', 'dateTime', 'report_date', 'reportDate', 'resultdate',
          'resultDate', 'approvedon', 'approvedOn', 'testdate', 'testDate',
          'collectedon', 'collectedOn', 'createdon', 'createdOn', 'completedDate',
          'requestedDate', 'collectedDate',
        ]);
        
        const split = combinedDT ? splitDateTime(combinedDT) : {date: '', time: ''};
        
        // Extract date and time separately if combined didn't work
        const date = split.date || pick(r, ['date', 'reportdate', 'report_date', 'testdate', 'test_date', 'completedDate', 'collectedDate', 'requestedDate'], '');
        const time = split.time || pick(r, ['time', 'reporttime', 'report_time', 'testtime', 'test_time'], '');
        
        // Format date if it's in a different format
        let formattedDate = date;
        if (date && date.includes('-')) {
          // Handle DD-MM-YYYY format from completedDate, etc.
          const parts = date.split(' ')[0].split('-'); // Take only date part if datetime
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              // YYYY-MM-DD format - keep as is or convert
              formattedDate = date.split(' ')[0]; // Just the date part
            } else if (parts[2].length === 4) {
              // DD-MM-YYYY format - convert to display format
              formattedDate = date.split(' ')[0]; // Keep as is for display
            }
          }
        }
        
        console.log(`[Investigation ${i}] name: ${name}, date: ${formattedDate}, time: ${time}, raw date fields:`, {
          completedDate: r.completedDate,
          requestedDate: r.requestedDate,
          collectedDate: r.collectedDate,
          combinedDT
        });
        
        return {
          id:       String(pick(r, ['id', 'investigationId', 'investigation_id', 'reportId',
                                     'report_id', 'testId', 'test_id', 'invId', 'investigationrequestId']) || i),
          name,
          category: deriveCategory(name),
          date:     formattedDate,
          time,
          location: pick(r, ['location', 'clinicName', 'clinic', 'labName', 'lab',
                               'centerName', 'center', 'hospital', 'hospitalName',
                               'branchName', 'branch'], 'Medical Center'),
          status:   pick(r, ['status', 'reportStatus', 'report_status', 'resultStatus',
                               'approvalStatus', 'approval_status', 'testStatus'], 'Normal'),
          iconBg:   '#FEE2E2',
          _raw:     r,
        };
      });
      mapped.sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
      setReports(mapped);
      
      // ── SAVE TO SQLITE FOR OFFLINE CACHING ─────────────────────────
      try {
        console.log('[InvestigationsScreen] � Saving', mapped.length, 'investigations to SQLite...');
        await saveInvestigations(mapped, patientId);
        console.log('[InvestigationsScreen] ✅ Saved investigations to SQLite successfully');
      } catch (error) {
        console.error('[InvestigationsScreen] ❌ Failed to save to SQLite:', error);
        // Continue anyway - at least the data is displayed
      }
      // ──────────────────────────────────────────────────────────────────
      
      // Enrich reports with dates from print API in background
      console.log('[InvestigationsScreen] Starting background enrichment...');
      // Use patientId as clientId (they're the same in this system)
      const clientId = patientId;
      console.log('[InvestigationsScreen] Using patientId as clientId:', clientId);
      if (clientId) {
        console.log('[InvestigationsScreen] Calling enrichInvestigationsWithDates for', mapped.length, 'reports');
        enrichInvestigationsWithDates(mapped, clientId, async (enrichedReports) => {
          console.log('[InvestigationsScreen] Received enriched reports update:', enrichedReports.length);
          setReports(enrichedReports);
          
          // Save enriched reports back to SQLite
          try {
            console.log('[InvestigationsScreen] 📦 SAVING ENRICHED REPORTS: Now saving', enrichedReports.length, 'enriched reports with detailed content to SQLite...');
            await saveInvestigations(enrichedReports, patientId);
            console.log('[InvestigationsScreen] ✅ SUCCESS: Saved enriched investigations with full details to SQLite for offline access!');
            
            // Verify the enriched save
            const verification = await getInvestigations(patientId);
            console.log('[InvestigationsScreen] 🔍 VERIFICATION: SQLite now contains', verification?.length || 0, 'enriched investigations');
          } catch (error) {
            console.error('[InvestigationsScreen] ❌ CRITICAL: Failed to save enriched reports to SQLite:', error);
            console.error('[InvestigationsScreen] This means offline report details will not work!');
          }
        }).catch(err => {
          console.error('[InvestigationsScreen] Enrichment error:', err);
        });
      } else {
        console.log('[InvestigationsScreen] No clientId, skipping enrichment');
      }
    } else {
      // API call failed
      console.error('[InvestigationsScreen] ❌ API call failed:', result.error || 'Unknown error');
      console.log('[InvestigationsScreen] Full API result:', JSON.stringify(result, null, 2));
    }
    } catch (error) {
      console.error('[InvestigationsScreen] Failed to fetch reports:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const onRefresh = () => fetchReports();

  const CATEGORY_MAP = {
    'Blood Test':  ['Blood Test'],
    'Urine Test':  ['Urine Test'],
    'Imaging':     ['Imaging'],
    'Others':      ['Others'],
  };

  // Date filtering helper
  const isWithinDateRange = (dateStr, filterType) => {
    if (filterType === 'All Time') return true;
    if (!dateStr) return false;

    const reportDate = new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const daysDiff = Math.floor((today - reportDate) / (1000 * 60 * 60 * 24));

    switch (filterType) {
      case 'Past Week':
        return daysDiff <= 7;
      case 'Past Month':
        return daysDiff <= 30;
      case 'Past 3 Months':
        return daysDiff <= 90;
      case 'Past 6 Months':
        return daysDiff <= 180;
      default:
        return true;
    }
  };

  const filteredReports = reports.filter(r => {
    const matchQuery = query ? r.name.toLowerCase().includes(query.toLowerCase()) : true;
    if (!matchQuery) return false;
    
    const matchCategory = filter === 'All' || r.category === filter;
    if (!matchCategory) return false;

    const matchDate = isWithinDateRange(r.date, dateFilter);
    return matchDate;
  });

  return (
    <>
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Fixed Compact Top Header */}
      <View style={styles.fixedHeader}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Investigations</Text>
            <Text style={styles.headerSub}>Book tests & view your medical reports</Text>
          </View>
          <TouchableOpacity onPress={() => setShowDateFilterModal(true)} style={styles.filterIconBtn}>
            <FilterIcon size={22} color={dateFilter !== 'All Time' ? colors.primary : colors.textSecondary} />
            {dateFilter !== 'All Time' && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Dominant Fixed Book Investigation Button */}
        <TouchableOpacity
          style={styles.dominantBookCard}
          onPress={() => navigation.navigate('InvestigationRequest')}
          activeOpacity={0.88}>
          <View style={styles.bookCardLeft}>
            <View style={styles.bookCardIcon}>
              <FlaskIcon size={20} color={colors.white} />
            </View>
            <View style={styles.bookCardInfo}>
              <Text style={styles.bookCardTitle}>Book an Investigation</Text>
              <Text style={styles.bookCardSub}>500+ Tests • Home Collection • Fast Digital Reports</Text>
            </View>
          </View>
          <View style={styles.bookCardBtn}>
            <Text style={styles.bookCardBtnText}>Book Now</Text>
            <ArrowRightIcon size={13} color={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Search */}
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by test name, date, or category" style={styles.search} />

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipSelected]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, filter === f && styles.chipTextSelected]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Date Filter Badge */}
        {dateFilter !== 'All Time' && (
          <View style={styles.activeDateFilterRow}>
            <View style={styles.activeDateFilterBadge}>
              <CalendarIcon size={12} color={colors.primary} />
              <Text style={styles.activeDateFilterText}>Date: {dateFilter}</Text>
              <TouchableOpacity onPress={() => setDateFilter('All Time')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.activeDateFilterClear}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }>

        {/* My Test Requests */}
        {testRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Test Requests</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{gap: spacing.sm}}>
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
                      <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                        {req.collectionType === 'home'
                          ? <HomeDeliveryIcon size={12} color={colors.textSecondary} />
                          : <HospitalBuildingIcon size={12} color={colors.textSecondary} />}
                        <Text style={styles.requestMeta}>
                          {req.collectionType === 'home' ? 'Home Collection' : 'Visit Hospital'} · {req.time}
                        </Text>
                      </View>
                    </View>
                    <StatusChip status={req.status === 'Approved' ? 'completed' : 'pending'} label={req.status} size="xs" />
                  </View>
                );
              })}
            </ScrollView>
          </View> 
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.sectionSub}>Newest first · pull to refresh</Text>
        </View>

        {loading ? (
          <>
            <SkeletonLoader.ReportCard />
            <SkeletonLoader.ReportCard />
            <SkeletonLoader.ReportCard />
            <SkeletonLoader.ReportCard />
            <SkeletonLoader.ReportCard />
          </>
        ) : filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No reports found for this filter.</Text>
          </View>
        ) : (
          filteredReports.map(r => (
            <TouchableOpacity key={r.id} style={styles.reportCard} onPress={() => navigation.navigate('InvestigationReport', {report: r})} activeOpacity={0.8}>
              <View style={[styles.reportIcon, {backgroundColor: r.iconBg}]}>
                {r.category === 'Blood Test' ? <BloodDropIcon size={24} color="#EF4444" />
                  : r.category === 'Urine Test' ? <BeakerIcon size={24} color="#3B82F6" />
                  : r.category === 'Imaging' ? <LungsIcon size={24} color="#8B5CF6" />
                  : <ClipboardIcon size={24} color="#6B7280" />}
              </View>
              <View style={styles.reportInfo}>
                <View style={styles.reportTopRow}>
                  <Text style={styles.reportName} numberOfLines={2}>{r.name}</Text>
                  <StatusChip status={r.status} size="xs" />
                </View>
                <Text style={styles.reportCat}>{r.category}</Text>
                <View style={styles.dateTimeHighlight}>
                  <ClockIcon size={14} color={colors.primary} />
                  <Text style={styles.reportDateHighlight}>{r.date} • {r.time}</Text>
                </View>
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

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateFilterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDateFilterModal(false)}>
          <Pressable style={styles.dateFilterModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setShowDateFilterModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {DATE_FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.dateOption, dateFilter === f && styles.dateOptionSelected]}
                  onPress={() => {
                    setDateFilter(f);
                    setShowDateFilterModal(false);
                  }}
                  activeOpacity={0.7}>
                  <Text style={[styles.dateOptionText, dateFilter === f && styles.dateOptionTextSelected]}>{f}</Text>
                  {dateFilter === f && (
                    <View style={styles.checkIcon}>
                      <Text style={styles.checkIconText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  fixedHeader: {backgroundColor: colors.background, paddingHorizontal: spacing.base, paddingTop: spacing['4xl'], paddingBottom: spacing.sm},
  scrollContainer: {flex: 1},
  scrollContent: {padding: spacing.base, paddingTop: spacing.sm, paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.base},
  back: {padding: 4, marginTop: 2},
  headerCenter: {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  headerSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  // Dominant Fixed Book Card
  dominantBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  bookCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.xs,
  },
  bookCardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCardInfo: {flex: 1},
  bookCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
  bookCardSub: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  bookCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  bookCardBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },

  section: {marginBottom: spacing.base},
  sectionHeader:{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  sectionSub:   {fontSize: 11, color: colors.textMuted},

  requestCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadows.sm, gap: spacing.md,
    width: 280,
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
  filterIconBtn: {padding: 4, position: 'relative'},
  filterDot: {position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary},
  activeDateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  activeDateFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  activeDateFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  activeDateFilterClear: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 4,
  },

  // Modal styles
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl},
  dateFilterModal: {backgroundColor: colors.surface, borderRadius: radius.xl, width: '100%', maxWidth: 320, ...shadows.lg},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border},
  modalTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  modalCloseBtn: {width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
  modalCloseText: {fontSize: 18, color: colors.textMuted, fontWeight: '600'},
  modalOptions: {padding: spacing.base},
  dateOption: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, borderRadius: radius.md, marginBottom: spacing.xs},
  dateOptionSelected: {backgroundColor: colors.primaryLight},
  dateOptionText: {fontSize: 15, color: colors.textPrimary, fontWeight: '500'},
  dateOptionTextSelected: {color: colors.primary, fontWeight: '700'},
  checkIcon: {width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
  checkIconText: {color: '#fff', fontSize: 14, fontWeight: '700'},

  emptyState: {alignItems: 'center', paddingVertical: spacing['3xl']},
  emptyText: {fontSize: 14, color: colors.textMuted},
  reportCard: {flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md},
  reportIcon: {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  reportInfo: {flex: 1, minWidth: 0},
  reportTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: spacing.sm},
  reportName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary, flex: 1, lineHeight: 20},
  reportCat: {fontSize: 11, color: colors.textMuted, marginBottom: 2},
  dateTimeHighlight: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: colors.primaryLight, 
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, 
    paddingVertical: 4, 
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  reportDateHighlight: {fontSize: 12, color: colors.primary, fontWeight: '700'},
  reportDate: {fontSize: 12, color: colors.textSecondary},
  reportLoc: {fontSize: 12, color: colors.textSecondary},

  helpCard: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, gap: spacing.md, marginTop: spacing.sm},
  helpIcon: {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  helpInfo: {flex: 1},
  helpTitle: {fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4},
  helpSub: {fontSize: 12, color: colors.textSecondary},
});