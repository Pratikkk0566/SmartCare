import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {InvoiceApi} from '../../API/Api';
import {useApp} from '../../context/AppContext';
import {StorageService} from '../../services/StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ArrowBackIcon, FilterIcon, DocumentIcon, DownloadIcon, ArrowRightIcon, InvoiceIcon, WalletIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

const TABS = ['All', 'Paid', 'Pending', 'Cancelled'];

const STATUS_COLORS = {Paid: colors.success, Pending: colors.warning, Cancelled: colors.error};
const STATUS_BG     = {Paid: colors.successLight, Pending: colors.warningLight, Cancelled: colors.errorLight};

// Fetch ALL invoices from the very beginning (year 2000) to today
const FROM_DATE = '2000-01-01';
function getToDate() { return new Date().toISOString().split('T')[0]; }

// Parse any date string to a comparable timestamp (returns 0 on failure)
function toTimestamp(dateStr = '') {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return isNaN(t) ? 0 : t;
}

function mapInvoice(inv) {
  // ── Real field names from billing/invoice/fetchinvoiceData response ──
  const amountNum  = Number(inv.invoice_amount  || 0);
  const balanceNum = Number(inv.balance_amount  || 0);
  const paidAmount = Number(inv.paid_amount     || 0);

  // Status: balance_amount === 0 → Paid, else Pending
  let status = (balanceNum === 0 && amountNum > 0) ? 'Paid' : 'Pending';
  // Explicit refund check
  if (inv.refund && Number(inv.refund) > 0) status = 'Refunded';

  // invoiceDate = "YYYY-MM-DD" (ISO — use for sorting)
  // invoice_date_time = "DD-MM-YYYY HH:MM:SS" (use for display)
  const isoDate     = inv.invoiceDate || '';          // YYYY-MM-DD
  const displayDate = inv.invoice_date_time            // "30-07-2025 09:45:53"
    ? inv.invoice_date_time.split(' ')[0]              // "30-07-2025"
    : isoDate;
  const displayTime = inv.invoice_date_time
    ? inv.invoice_date_time.split(' ')[1]?.slice(0, 5) // "09:45"
    : '';

  // Human-readable description: consultant + type
  const consultant = inv.counsultant || '';
  const invType    = inv.invoice_type || '';           // "OPD" / "IPD"
  const invSuffix  = inv.invoice_suffix || '';
  const description = consultant
    ? `${invType ? invType + ' · ' : ''}${consultant}`
    : (inv.description || invType || 'Consultation');

  return {
    id:          String(inv.location_Wise_Invoice_no || inv.invoice_id || ''),
    ipdAbr:      inv.ipdAbirvationId || '',             // e.g. "SCD/IP/25/0305"
    date:        displayDate,
    time:        displayTime,
    description,
    consultant,
    invType,
    invSuffix,
    amount:      `₹${amountNum.toLocaleString('en-IN', {minimumFractionDigits: 2})}`,
    rawAmount:   amountNum,
    balance:     balanceNum,
    paidAmount,
    paymentMode: inv.payment_mode || '',
    status,
    _isoDate:    isoDate,   // used for sorting
    _raw:        inv,
  };
}

export default function InvoicesScreen({navigation}) {
  const {invoices: cachedInvoices, isOnline, invoicesLastUpdated} = useApp();
  const [activeTab,  setActiveTab]  = useState('All');
  const [invoices,   setInvoices]   = useState(cachedInvoices || []);
  const [loading,    setLoading]    = useState(cachedInvoices.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    let patientId = await AsyncStorage.getItem('patientId');

    // patientId may not be set yet if login just completed — wait briefly and retry once
    if (!patientId) {
      await new Promise(r => setTimeout(r, 1500));
      patientId = await AsyncStorage.getItem('patientId');
    }
    if (!patientId) {
      console.log('[InvoicesScreen] patientId still not available, aborting fetch');
      setLoading(false); setRefreshing(false); return;
    }

    // Debug: log the values that will be sent as headers
    const clinicId  = await AsyncStorage.getItem('CLINICID');
    const userId    = await AsyncStorage.getItem('UserId') || await AsyncStorage.getItem('userid');
    const branchId  = await AsyncStorage.getItem('branch_id') || await AsyncStorage.getItem('branchId');
    console.log('[InvoicesScreen] fetching with patientId:', patientId,
      '| clinicId:', clinicId, '| userId:', userId, '| branchId:', branchId);

    const result = await InvoiceApi.getAll(patientId, FROM_DATE, getToDate());
    console.log('[InvoicesScreen] API result success:', result.success, '| raw data keys:', result.data ? Object.keys(result.data) : 'null');
    if (result.success) {
      const serverData = result.data;
      const inner      = serverData?.data   || serverData;
      const listObj    = inner?.list        || inner;
      const rawList    = listObj?.invoiceDataList
                      || listObj?.invoices
                      || (Array.isArray(listObj) ? listObj : []);

      console.log('[InvoicesScreen] invoiceDataList length:', rawList.length);

      const mapped = rawList.map(mapInvoice);
      // Sort newest first — invoiceDate is "YYYY-MM-DD" (clean ISO, directly sortable)
      mapped.sort((a, b) => toTimestamp(b._isoDate) - toTimestamp(a._isoDate));
      setInvoices(mapped);
      // Save to cache
      await StorageService.saveInvoices(mapped);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Load cached invoices on mount
  useEffect(() => {
    if (cachedInvoices && cachedInvoices.length > 0) {
      console.log('[InvoicesScreen] Using cached invoices:', cachedInvoices.length);
      setInvoices(cachedInvoices);
      setLoading(false);
    }
  }, [cachedInvoices]);

  // Fetch on first mount (if online)
  useEffect(() => { 
    if (isOnline) {
      fetchInvoices(); 
    }
  }, [fetchInvoices, isOnline]);

  // Re-fetch every time the screen comes into focus — but only after initial load
  useFocusEffect(useCallback(() => {
    // skip the very first focus (useEffect on mount already handles it)
    fetchInvoices(true);
  }, [fetchInvoices]));

  const onRefresh = () => { setRefreshing(true); fetchInvoices(true); };

  const filtered = invoices.filter(inv =>
    activeTab === 'All' ? true : inv.status === activeTab,
  );

  const totalPaid      = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.rawAmount, 0);
  const totalPending   = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.rawAmount, 0);
  const totalCancelled = invoices.filter(i => i.status === 'Cancelled').reduce((s, i) => s + i.rawAmount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoices & Bills</Text>
          <TouchableOpacity onPress={onRefresh}>
            <FilterIcon size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabSelected]}
              onPress={() => setActiveTab(t)}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextSelected]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.sectionSub}>Newest first · pull to refresh</Text>
        </View>

        {/* Invoice list */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{marginVertical: 48}} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={{width:64, height:64, borderRadius:32, backgroundColor:colors.primaryLight, alignItems:'center', justifyContent:'center', marginBottom:spacing.md}}>
              <InvoiceIcon size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No invoices found</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'All' ? 'No billing records on this account yet.' : `No ${activeTab.toLowerCase()} invoices.`}
            </Text>
          </View>
        ) : (
          filtered.map(inv => (
            <TouchableOpacity
              key={inv.id || Math.random().toString()}
              style={styles.invRow}
              onPress={() => Alert.alert(
                `Invoice #${inv.id}`,
                `Amount: ${inv.amount}\nPaid: ₹${inv.paidAmount.toLocaleString('en-IN')}\nBalance: ₹${inv.balance.toLocaleString('en-IN')}\nDate: ${inv.date}${inv.time ? ' ' + inv.time : ''}\nType: ${inv.invType || '—'}\nPayment: ${inv.paymentMode || '—'}\nStatus: ${inv.status}`,
              )}
              activeOpacity={0.8}>
              <View style={[styles.invIcon, {backgroundColor: STATUS_BG[inv.status] || '#F3F4F6'}]}>
                <DocumentIcon size={22} color={STATUS_COLORS[inv.status] || colors.textMuted} />
              </View>
              <View style={styles.invInfo}>
                <View style={styles.invTopRow}>
                  <Text style={styles.invId} numberOfLines={1}>
                    {inv.ipdAbr || `#${inv.id}`}
                  </Text>
                  {inv.invType ? (
                    <View style={[styles.typeBadge, {backgroundColor: inv.invType === 'IPD' ? '#FEE2E2' : '#DBEAFE'}]}>
                      <Text style={[styles.typeBadgeText, {color: inv.invType === 'IPD' ? '#EF4444' : '#3B82F6'}]}>
                        {inv.invType}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.invDate}>{inv.date}{inv.time ? ` · ${inv.time}` : ''}</Text>
                <Text style={styles.invDesc} numberOfLines={1}>{inv.description}</Text>
                {inv.paymentMode ? (
                  <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                    <WalletIcon size={11} color={colors.textMuted} />
                    <Text style={styles.invMeta}>{inv.paymentMode}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.invRight}>
                <Text style={styles.invAmount}>{inv.amount}</Text>
                <StatusChip status={inv.status} size="xs" />
              </View>
              <ArrowRightIcon size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        )}

        {/* Download hint */}
        {!loading && (
          <View style={styles.helpCard}>
            <View style={[styles.helpIcon, {backgroundColor: colors.primaryLight}]}>
              <DownloadIcon size={24} color={colors.primary} />
            </View>
            <View style={styles.helpInfo}>
              <Text style={styles.helpTitle}>Need an Invoice?</Text>
              <Text style={styles.helpSub}>Download your invoice and claim for insurance reimbursement.</Text>
              <TouchableOpacity
                style={styles.learnBtn}
                onPress={() => Alert.alert('Download', 'PDF download feature coming soon!')}>
                <Text style={styles.learnBtnText}>Learn More</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Summary */}
        {!loading && invoices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: spacing.base}]}>Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{invoices.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={[styles.statBox, styles.statBorderLeft]}>
                <Text style={[styles.statNum, {color: colors.success}]}>
                  {invoices.filter(i => i.status === 'Paid').length}
                </Text>
                <Text style={styles.statLabel}>Paid</Text>
                <Text style={[styles.statAmount, {color: colors.success}]}>
                  ₹{totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </Text>
              </View>
              <View style={[styles.statBox, styles.statBorderLeft]}>
                <Text style={[styles.statNum, {color: colors.warning}]}>
                  {invoices.filter(i => i.status === 'Pending').length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statAmount, {color: colors.warning}]}>
                  ₹{totalPending.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </Text>
              </View>
              <View style={[styles.statBox, styles.statBorderLeft]}>
                <Text style={[styles.statNum, {color: colors.error}]}>
                  {invoices.filter(i => i.status === 'Cancelled').length}
                </Text>
                <Text style={styles.statLabel}>Cancelled</Text>
                <Text style={[styles.statAmount, {color: colors.error}]}>
                  ₹{totalCancelled.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         {flex: 1, backgroundColor: colors.background},
  scroll:       {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header:       {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base},
  back:         {padding: 4},
  headerTitle:  {flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  tabBar:       {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, marginBottom: spacing.sm, ...shadows.sm},
  tab:          {flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm},
  tabSelected:  {backgroundColor: colors.primary},
  tabText:      {fontSize: 13, color: colors.textSecondary, fontWeight: '500'},
  tabTextSelected: {color: '#fff', fontWeight: '700'},
  sectionHeader:{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary},
  sectionSub:   {fontSize: 11, color: colors.textMuted},
  empty:        {alignItems: 'center', paddingVertical: 48},
  emptyTitle:   {fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 6},
  emptySub:     {fontSize: 13, color: colors.textSecondary, textAlign: 'center'},
  invRow:       {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md},
  invIcon:      {width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  invInfo:      {flex: 1},
  invId:        {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  invTopRow:    {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2},
  typeBadge:    {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  typeBadgeText:{fontSize: 10, fontWeight: '800'},
  invDate:      {fontSize: 11, color: colors.textMuted, marginTop: 1},
  invDesc:      {fontSize: 12, color: colors.textSecondary, marginTop: 1},
  invMeta:      {fontSize: 11, color: colors.textMuted, marginTop: 1},
  invRight:     {alignItems: 'flex-end', gap: 4},
  invAmount:    {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  helpCard:     {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, gap: spacing.md, marginBottom: spacing.base},
  helpIcon:     {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  helpInfo:     {flex: 1},
  helpTitle:    {fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4},
  helpSub:      {fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm},
  learnBtn:     {borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6, alignSelf: 'flex-start'},
  learnBtnText: {color: colors.primary, fontSize: 12, fontWeight: '700'},
  summaryGrid:  {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, ...shadows.sm, marginBottom: spacing.base},
  statBox:      {flex: 1, padding: spacing.md, alignItems: 'center'},
  statBorderLeft: {borderLeftWidth: 1, borderLeftColor: colors.border},
  statNum:      {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  statLabel:    {fontSize: 11, color: colors.textMuted, marginTop: 2},
  statAmount:   {fontSize: 10, fontWeight: '600', marginTop: 2},
});
