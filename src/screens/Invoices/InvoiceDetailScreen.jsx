import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Share,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {
  ArrowBackIcon,
  DownloadIcon,
  InvoiceIcon,
  WalletIcon,
  PersonIcon,
  CalendarIcon,
  CheckCircleIcon,
  DocumentIcon,
} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

// Helper component for info rows
function InfoRow({icon: Icon, label, value}) {
  if (!value || value === '— / —') return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        {Icon ? <Icon size={14} color={colors.textMuted} /> : null}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function InvoiceDetailScreen({route, navigation}) {
  const {invoice} = route.params || {};
  const [downloading, setDownloading] = useState(false);

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Details</Text>
          <View style={{width: 40}} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No invoice details found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const raw = invoice._raw || {};
  const invoiceId = invoice.id || raw.invoice_id || raw.location_Wise_Invoice_no || 'N/A';
  const invoiceNo = raw.location_Wise_Invoice_no || raw.invoice_no || raw.billno || invoiceId;
  const displayId = raw.ipdAbirvationId || `#${invoiceNo}`;

  // Charges breakdown & payment logs
  const chargeTransactions = raw.chargeTransaction || [];
  const paymentLogs = raw.payment_log || [];

  // Financial values
  const rawAmount = Number(invoice.rawAmount ?? raw.net_amount ?? raw.totalAmount ?? 0);
  const paidAmount = Number(invoice.paidAmount ?? raw.paid_amount ?? rawAmount);
  const balance = Number(invoice.balance ?? raw.balance_amount ?? Math.max(0, rawAmount - paidAmount));
  const discountAmount = Number(raw.discount_amount ?? 0);
  const discountPercent = Number(raw.discount_percent ?? 0);

  // Request storage permission on older Android versions if needed
  const checkStoragePermission = async () => {
    if (Platform.OS === 'android' && Platform.Version < 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'SmartCare needs access to save invoice PDF files to your device.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  // Download Invoice Receipt / Text File
  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save the invoice.');
        setDownloading(false);
        return;
      }

      const downloadDir = Platform.OS === 'android'
        ? `${RNFS.DownloadDirectoryPath}/SmartCare/Invoices`
        : `${RNFS.DocumentDirectoryPath}/SmartCare/Invoices`;

      await RNFS.mkdir(downloadDir, {NSURLIsExcludedFromBackupKey: false}).catch(err =>
        console.log('Directory exists:', err),
      );

      const safeInvNo = String(invoiceNo).replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const fileName = `Invoice_${safeInvNo}_${timestamp}.txt`;
      const filePath = `${downloadDir}/${fileName}`;

      const receiptContent = `
=====================================================
               SMARTCARE MEDICAL INVOICE
=====================================================
Invoice No   : ${invoiceNo}
Encounter ID : ${displayId}
Date & Time  : ${invoice.date || ''} ${invoice.time ? '· ' + invoice.time : ''}
Invoice Type : ${raw.invoice_type || (raw.ipd_id ? 'IPD' : 'OPD')}
Status       : ${invoice.status || 'Paid'}

PATIENT INFORMATION:
-----------------------------------------------------
Name         : ${raw.patient_name || '—'}
UHID         : ${raw.uhid || '—'}
Age / Gender : ${raw.age || '—'} / ${raw.gender || '—'}
Contact      : ${raw.contact_number || '—'}

FINANCIAL SUMMARY:
-----------------------------------------------------
Total Amount : ₹${rawAmount.toFixed(2)}
Paid Amount  : ₹${paidAmount.toFixed(2)}
Balance Due  : ₹${balance.toFixed(2)}
Discount     : ₹${discountAmount.toFixed(2)} (${discountPercent}%)

PAYMENT DETAILS:
-----------------------------------------------------
Payment Mode : ${invoice.paymentMode || raw.payment_mode || 'Cash'}
Payment Date : ${raw.transaction?.payment_time?.split(' ')[0] || invoice.date || '—'}
Payment Note : ${raw.transaction?.payment_note || 'Settled'}

INVOICE INFORMATION:
-----------------------------------------------------
Consultant   : ${raw.counsultant || raw.doctor || '—'}
Qualification: ${raw.counsultant_qualification || '—'}
Referred By  : ${raw.refral_name && raw.refral_name !== '0' ? raw.refral_name : 'Direct'}
Prepared By  : ${raw.invoice_prepared_by || '—'}
=====================================================
Thank you for choosing SmartCare.
=====================================================
      `.trim();

      await RNFS.writeFile(filePath, receiptContent, 'utf8');

      Alert.alert(
        'Download Complete',
        `Invoice details saved to:\nDownload/SmartCare/Invoices/\n\nFile: ${fileName}`,
        [{text: 'OK'}],
      );
    } catch (error) {
      console.log('[InvoiceDetailScreen] Download error:', error);
      Alert.alert('Download Error', error.message || 'Failed to save invoice.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Invoice ${invoiceNo}`,
        message: `SmartCare Invoice ${displayId}\nPatient: ${raw.patient_name || 'Patient'} (UHID: ${raw.uhid || '—'})\nDate: ${invoice.date || ''}\nTotal: ₹${rawAmount.toLocaleString('en-IN')}\nStatus: ${invoice.status || 'Paid'}`,
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Invoice Details
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {displayId}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.topDownloadBtn, downloading && {opacity: 0.6}]}
          onPress={handleDownloadInvoice}
          disabled={downloading}
          activeOpacity={0.75}>
          {downloading ? (
            <ActivityIndicator size="small" color="#0ea5a2" />
          ) : (
            <DownloadIcon size={20} color="#0ea5a2" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* 1. Status Badge & Encounter Type */}
        <View style={styles.statusRow}>
          <StatusChip status={invoice.status || 'Paid'} size="md" />
          {raw.invoice_type && (
            <View
              style={[
                styles.typeBadge,
                {backgroundColor: raw.invoice_type === 'IPD' ? '#FEE2E2' : '#DBEAFE'},
              ]}>
              <Text
                style={[
                  styles.typeBadgeText,
                  {color: raw.invoice_type === 'IPD' ? '#EF4444' : '#3B82F6'},
                ]}>
                {raw.invoice_type}
              </Text>
            </View>
          )}
        </View>

        {/* 2. Top Container of Price (Teal Tinted Card) */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>
            {invoice.amount || `₹${rawAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`}
          </Text>
          <View style={styles.amountBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Paid Amount</Text>
              <Text style={[styles.breakdownValue, {color: colors.success}]}>
                ₹{paidAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Balance</Text>
              <Text
                style={[
                  styles.breakdownValue,
                  {color: balance > 0 ? colors.warning : colors.textMuted},
                ]}>
                ₹{balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Discount ({discountPercent}%)</Text>
                <Text style={[styles.breakdownValue, {color: colors.success}]}>
                  -₹{discountAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. PATIENT INFORMATION */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>PATIENT INFORMATION</Text>
          <InfoRow icon={PersonIcon} label="Name" value={raw.patient_name || '—'} />
          <InfoRow icon={DocumentIcon} label="UHID" value={raw.uhid || '—'} />
          <InfoRow
            icon={CalendarIcon}
            label="Age / Gender"
            value={`${raw.age || '—'} / ${raw.gender || '—'}`}
          />
          <InfoRow icon={CalendarIcon} label="Contact" value={raw.contact_number || '—'} />
        </View>

        {/* 4. CHARGES BREAKDOWN */}
        {chargeTransactions.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>CHARGES BREAKDOWN</Text>
            {chargeTransactions.map((charge, idx) => (
              <View key={idx} style={styles.chargeGroup}>
                <View style={styles.chargeHeader}>
                  <Text style={styles.chargeName}>{charge.master_charge_name || `Charge #${idx + 1}`}</Text>
                  <Text style={styles.chargeAmount}>
                    ₹{Number(charge.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </Text>
                </View>
                {charge.charge_list?.map((item, i) => (
                  <View key={i} style={styles.chargeItem}>
                    <Text style={styles.chargeItemName}>• {item.chargename || 'Service'}</Text>
                    <Text style={styles.chargeItemAmount}>
                      ₹{Number(item.charge_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})} × {item.quantity || 1}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* 5. PAYMENT DETAILS */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>PAYMENT DETAILS</Text>
          <InfoRow
            icon={WalletIcon}
            label="Payment Mode"
            value={invoice.paymentMode || raw.payment_mode || 'Cash'}
          />
          {raw.transaction && (
            <>
              <InfoRow
                icon={CalendarIcon}
                label="Payment Date"
                value={raw.transaction.payment_time?.split(' ')[0] || '—'}
              />
              {raw.transaction.payment_note && (
                <InfoRow icon={DocumentIcon} label="Note" value={raw.transaction.payment_note} />
              )}
            </>
          )}
        </View>

        {/* 6. INVOICE INFORMATION */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>INVOICE INFORMATION</Text>
          <InfoRow
            icon={CalendarIcon}
            label="Date & Time"
            value={`${invoice.date || ''}${invoice.time ? ' · ' + invoice.time : ''}`}
          />
          <InfoRow icon={PersonIcon} label="Consultant" value={raw.counsultant || raw.doctor || '—'} />
          {raw.counsultant_qualification && (
            <InfoRow
              icon={DocumentIcon}
              label="Qualification"
              value={raw.counsultant_qualification}
            />
          )}
          {raw.refral_name && raw.refral_name !== '0' && (
            <InfoRow icon={PersonIcon} label="Referred By" value={raw.refral_name} />
          )}
          <InfoRow
            icon={DocumentIcon}
            label="Prepared By"
            value={raw.invoice_prepared_by || '—'}
          />
        </View>

        {/* 7. PAYMENT HISTORY */}
        {paymentLogs.length > 1 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>PAYMENT HISTORY</Text>
            {paymentLogs.map((log, idx) => (
              <View key={idx} style={styles.paymentLogRow}>
                <View>
                  <Text style={styles.paymentLogMode}>{log.payment_mode || 'Cash'}</Text>
                  <Text style={styles.paymentLogTime}>{log.payment_time?.split(' ')[0] || '—'}</Text>
                </View>
                <Text style={styles.paymentLogAmount}>
                  ₹{Number(log.part_payment_amount || log.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 8. Note if available */}
        {raw.invoice_note && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Note</Text>
            <Text style={styles.noteText}>{raw.invoice_note}</Text>
          </View>
        )}

        <View style={{height: 30}} />
      </ScrollView>

      {/* Bottom Floating Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
          onPress={handleDownloadInvoice}
          disabled={downloading}
          activeOpacity={0.85}>
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <DownloadIcon size={18} color="#fff" />
              <Text style={styles.downloadBtnText}>Download Invoice</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FFFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  topDownloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6FFFA',
    borderWidth: 1,
    borderColor: '#B2F5EA',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#374151',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    maxWidth: '55%',
  },
  chargeGroup: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chargeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chargeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  chargeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  chargeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingLeft: spacing.sm,
    marginTop: 2,
  },
  chargeItemName: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    marginRight: 8,
  },
  chargeItemAmount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  paymentLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
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
    color: '#6B7280',
  },
  paymentLogAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  noteCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  noteText: {
    fontSize: 13,
    color: '#78350F',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  shareBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#0ea5a2',
    borderRadius: radius.md,
    ...shadows.sm,
  },
  downloadBtnDisabled: {
    opacity: 0.7,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
