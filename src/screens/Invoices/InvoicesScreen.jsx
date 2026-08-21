import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, Modal, Pressable,
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
import {ArrowBackIcon, FilterIcon, DocumentIcon, ArrowRightIcon, InvoiceIcon, WalletIcon, PersonIcon, CalendarIcon, CheckCircleIcon, XIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

// ─── Invoice Detail Modal Component ─────────────────────────────────────────
function InvoiceDetailModal({visible, invoice, onClose}) {
  if (!invoice) return null;

  const raw = invoice._raw || {};
  
  // Extract charges
  const chargeTransactions = raw.chargeTransaction || [];
  const paymentLogs = raw.payment_log || [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIcon, {backgroundColor: '#0ea5a2' + '20'}]}>
                <InvoiceIcon size={24} color="#0ea5a2" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Invoice Details</Text>
                <Text style={styles.modalSubtitle}>
                  {raw.ipdAbirvationId || `#${invoice.id}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <XIcon size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {/* Status Badge */}
            <View style={styles.statusRow}>
              <StatusChip status={invoice.status} size="md" />
              {raw.invoice_type && (
                <View style={[styles.typeBadge, {backgroundColor: raw.invoice_type === 'IPD' ? '#FEE2E2' : '#DBEAFE'}]}>
                  <Text style={[styles.typeBadgeText, {color: raw.invoice_type === 'IPD' ? '#EF4444' : '#3B82F6'}]}>
                    {raw.invoice_type}
                  </Text>
                </View>
              )}
            </View>

            {/* Amount Card */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>{invoice.amount}</Text>
              <View style={styles.amountBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Paid Amount</Text>
                  <Text style={[styles.breakdownValue, {color: colors.success}]}>
                    ₹{invoice.paidAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Balance</Text>
                  <Text style={[styles.breakdownValue, {color: invoice.balance > 0 ? colors.warning : colors.textMuted}]}>
                    ₹{invoice.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </Text>
                </View>
                {raw.discount_amount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Discount ({raw.discount_percent}%)</Text>
                    <Text style={[styles.breakdownValue, {color: colors.success}]}>
                      -₹{Number(raw.discount_amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Patient Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>PATIENT INFORMATION</Text>
              <InfoRow icon={PersonIcon} label="Name" value={raw.patient_name || '—'} />
              <InfoRow icon={DocumentIcon} label="UHID" value={raw.uhid || '—'} />
              <InfoRow icon={CalendarIcon} label="Age / Gender" value={`${raw.age || '—'} / ${raw.gender || '—'}`} />
              <InfoRow icon={CalendarIcon} label="Contact" value={raw.contact_number || '—'} />
            </View>

            {/* Invoice Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>INVOICE INFORMATION</Text>
              <InfoRow icon={CalendarIcon} label="Date & Time" value={`${invoice.date}${invoice.time ? ' · ' + invoice.time : ''}`} />
              <InfoRow icon={PersonIcon} label="Consultant" value={raw.counsultant || '—'} />
              {raw.counsultant_qualification && (
                <InfoRow icon={DocumentIcon} label="Qualification" value={raw.counsultant_qualification} />
              )}
              {raw.refral_name && raw.refral_name !== '0' && (
                <InfoRow icon={PersonIcon} label="Referred By" value={raw.refral_name} />
              )}
              <InfoRow icon={DocumentIcon} label="Prepared By" value={raw.invoice_prepared_by || '—'} />
            </View>

            {/* Payment Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>PAYMENT DETAILS</Text>
              <InfoRow icon={WalletIcon} label="Payment Mode" value={invoice.paymentMode || '—'} />
              {raw.transaction && (
                <>
                  <InfoRow icon={CalendarIcon} label="Payment Date" value={raw.transaction.payment_time?.split(' ')[0] || '—'} />
                  {raw.transaction.payment_note && (
                    <InfoRow icon={DocumentIcon} label="Note" value={raw.transaction.payment_note} />
                  )}
                </>
              )}
            </View>

            {/* Charges Breakdown */}
            {chargeTransactions.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionLabel}>CHARGES BREAKDOWN</Text>
                {chargeTransactions.map((charge, idx) => (
                  <View key={idx} style={styles.chargeGroup}>
                    <View style={styles.chargeHeader}>
                      <Text style={styles.chargeName}>{charge.master_charge_name}</Text>
                      <Text style={styles.chargeAmount}>
                        ₹{Number(charge.total_amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                      </Text>
                    </View>
                    {charge.charge_list?.map((item, i) => (
                      <View key={i} style={styles.chargeItem}>
                        <Text style={styles.chargeItemName}>• {item.chargename}</Text>
                        <Text style={styles.chargeItemAmount}>
                          ₹{Number(item.charge_amount).toLocaleString('en-IN', {minimumFractionDigits: 2})} × {item.quantity}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Payment History */}
            {paymentLogs.length > 1 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionLabel}>PAYMENT HISTORY</Text>
                {paymentLogs.map((log, idx) => (
                  <View key={idx} style={styles.paymentLogRow}>
                    <View>
                      <Text style={styles.paymentLogMode}>{log.payment_mode}</Text>
                      <Text style={styles.paymentLogTime}>{log.payment_time?.split(' ')[0] || '—'}</Text>
                    </View>
                    <Text style={styles.paymentLogAmount}>
                      ₹{Number(log.part_payment_amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {raw.invoice_note && (
              <View style={styles.noteCard}>
                <Text style={styles.noteLabel}>Note</Text>
                <Text style={styles.noteText}>{raw.invoice_note}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSecondary]}
                onPress={onClose}>
                <Text style={styles.actionBtnTextSecondary}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Helper component for info rows
function InfoRow({icon: Icon, label, value}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Icon size={14} color={colors.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const TABS = ['All', 'Paid', 'Pending', 'Cancelled'];

const STATUS_COLORS = {Paid: colors.success, Pending: colors.warning, Cancelled: colors.error};
const STATUS_BG     = {Paid: colors.successLight, Pending: colors.warningLight, Cancelled: colors.errorLight};

// Fetch ALL invoices from the very beginning (year 2000) to today end of day
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

  // Capture referral name
  const referralName = inv.refral_name && inv.refral_name !== '0' ? inv.refral_name : '';

  return {
    id:          String(inv.location_Wise_Invoice_no || inv.invoice_id || ''),
    ipdAbr:      inv.ipdAbirvationId || '',             // e.g. "SCD/IP/25/0305"
    date:        displayDate,
    time:        displayTime,
    description,
    consultant,
    invType,
    invSuffix,
    referralName,
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
  const {invoices: cachedInvoices, isOnline, refreshAllData, appReady} = useApp();
  const [activeTab,  setActiveTab]  = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Map cached context invoices through the richer local normaliser
  // Context stores a simplified shape; we need the billing-specific fields for display.
  // On first load we use what context has; pull-to-refresh re-fetches via API.
  const mapFromContext = useCallback((list) =>
    list.map(inv => ({
      ...inv,
      // Ensure these fields exist for the UI (context shape may lack some)
      ipdAbr:      inv.ipdAbr      || '',
      time:        inv.time        || '',
      invType:     inv.invType     || '',
      referralName: inv.referralName || '',
      paymentMode: inv.paymentMode || '',
      rawAmount:   typeof inv.rawAmount === 'number' ? inv.rawAmount
                    : Number(String(inv.amount || '0').replace(/[^\d.]/g, '')) || 0,
      balance:     typeof inv.balance   === 'number' ? inv.balance   : 0,
      paidAmount:  typeof inv.paidAmount === 'number' ? inv.paidAmount : 0,
      _isoDate:    inv._isoDate    || inv.date || '',
    }))
  , []);

  const [invoices,   setInvoices]   = useState(() => mapFromContext(cachedInvoices || []));
  const [loading,    setLoading]    = useState(!appReady && cachedInvoices.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      if (cachedInvoices && cachedInvoices.length > 0) {
        setInvoices(mapFromContext(cachedInvoices));
        setLoading(false);
      } else if (appReady) {
        // App is ready but no cached data - fetch immediately
        fetchInvoices();
      }
    }, [cachedInvoices, appReady, mapFromContext])
  );

  // Keep local state in sync when context updates (e.g. after login data fetch)
  useEffect(() => {
    if (cachedInvoices && cachedInvoices.length > 0) {
      setInvoices(mapFromContext(cachedInvoices));
      setLoading(false);
    }
  }, [cachedInvoices, mapFromContext]);

  // Once app is ready, always stop the spinner — show empty state if no data
  useEffect(() => {
    if (appReady) setLoading(false);
  }, [appReady]);

  // Full re-fetch — only called on explicit pull-to-refresh
  const fetchInvoices = async () => {
    setRefreshing(true);
    let patientId = await AsyncStorage.getItem('patientId');
    if (!patientId) { setRefreshing(false); setLoading(false); return; }

    const result = await InvoiceApi.getAll(patientId, FROM_DATE, getToDate());
    if (result.success) {
      const serverData = result.data;
      const inner      = serverData?.data   || serverData;
      const listObj    = inner?.list        || inner;
      const rawList    = listObj?.invoiceDataList
                      || listObj?.invoices
                      || (Array.isArray(listObj) ? listObj : []);

      const mapped = rawList.map(mapInvoice);
      mapped.sort((a, b) => toTimestamp(b._isoDate) - toTimestamp(a._isoDate));
      setInvoices(mapped);
      await StorageService.saveInvoices(mapped);
    }
    setRefreshing(false);
    setLoading(false);
  };

  const onRefresh = () => fetchInvoices();

  const filtered = invoices.filter(inv =>
    activeTab === 'All' ? true : inv.status === activeTab,
  );

  const totalPaid      = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.rawAmount, 0);
  const totalPending   = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.rawAmount, 0);
  const totalCancelled = invoices.filter(i => i.status === 'Cancelled').reduce((s, i) => s + i.rawAmount, 0);

  const handleInvoicePress = (invoice) => {
    setSelectedInvoice(invoice);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
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

        {/* Summary - Moved to top */}
        {!loading && invoices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginBottom: spacing.sm}]}>Summary</Text>
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.sectionSub}>Newest first · pull to refresh</Text>
        </View>
      </View>

      {/* Scrollable Invoice List */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }>

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
              onPress={() => handleInvoicePress(inv)}
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
                {inv.referralName ? (
                  <View style={styles.invReferralRow}>
                    <PersonIcon size={11} color={colors.primary} />
                    <Text style={styles.invReferral}>Referred by: {inv.referralName}</Text>
                  </View>
                ) : null}
                {inv.paymentMode ? (
                  <View style={{flexDirection:'row', alignItems:'center', gap:4, marginTop:2}}>
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

      </ScrollView>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        visible={modalVisible}
        invoice={selectedInvoice}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         {flex: 1, backgroundColor: colors.background},
  fixedHeader:  {backgroundColor: colors.background, paddingHorizontal: spacing.base, paddingTop: spacing['4xl'], paddingBottom: spacing.sm},
  scrollContainer: {flex: 1},
  scrollContent: {padding: spacing.base, paddingTop: spacing.sm, paddingBottom: 32},
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
  invDate:      {fontSize: 12, color: colors.textPrimary, marginTop: 2, fontWeight: '700'},
  invDesc:      {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  invReferralRow: {flexDirection:'row', alignItems:'center', gap:4, marginTop:3},
  invReferral:  {fontSize: 11, color: colors.primary, fontWeight: '600'},
  invMeta:      {fontSize: 11, color: colors.textMuted, marginTop: 1},
  invRight:     {alignItems: 'flex-end', gap: 4},
  invAmount:    {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  summaryGrid:  {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, ...shadows.sm, marginBottom: spacing.base},
  statBox:      {flex: 1, padding: spacing.md, alignItems: 'center'},
  statBorderLeft: {borderLeftWidth: 1, borderLeftColor: colors.border},
  statNum:      {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  statLabel:    {fontSize: 11, color: colors.textMuted, marginTop: 2},
  statAmount:   {fontSize: 10, fontWeight: '600', marginTop: 2},

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F9FFFE',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '90%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  amountCard: {
    backgroundColor: '#0ea5a2' + '10',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#0ea5a2' + '30',
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0ea5a2',
    marginBottom: spacing.md,
  },
  amountBreakdown: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  chargeGroup: {
    marginBottom: spacing.md,
  },
  chargeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chargeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  chargeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0ea5a2',
  },
  chargeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.md,
    marginBottom: 4,
  },
  chargeItemName: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  chargeItemAmount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  paymentLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentLogMode: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paymentLogTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentLogAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0ea5a2',
  },
  noteCard: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: 0,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  actionBtnPrimary: {
    backgroundColor: '#0ea5a2',
  },
  actionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  actionBtnTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnTextSecondary: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
