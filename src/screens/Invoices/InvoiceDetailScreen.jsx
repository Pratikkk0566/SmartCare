import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
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
import { InvoiceApi } from '../../API/Api';
import { generateInvoiceHtml, mapInvoiceRecord } from '../../utils/invoiceHtmlGenerator';

// Converts binary string / stream into safe base64 without InvalidCharacterError
function toBase64(str) {
  if (!str) return '';
  const trimmed = String(str).replace(/^data:application\/pdf;base64,/, '').trim();
  // If already base64 string
  if (trimmed.startsWith('JVBERi') || /^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 80))) {
    return trimmed;
  }

  // Convert binary character codes into base64
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  const len = str.length;
  while (i < len) {
    const c1 = str.charCodeAt(i++) & 0xff;
    if (i === len) {
      out += chars.charAt(c1 >> 2);
      out += chars.charAt((c1 & 0x3) << 4);
      out += '==';
      break;
    }
    const c2 = str.charCodeAt(i++) & 0xff;
    if (i === len) {
      out += chars.charAt(c1 >> 2);
      out += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
      out += chars.charAt((c2 & 0xf) << 2);
      out += '=';
      break;
    }
    const c3 = str.charCodeAt(i++) & 0xff;
    out += chars.charAt(c1 >> 2);
    out += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
    out += chars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
    out += chars.charAt(c3 & 0x3f);
  }
  return out;
}

// Helper component for info rows
function InfoRow({ icon: Icon, label, value }) {
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

export default function InvoiceDetailScreen({ route, navigation }) {
  const { invoice } = route.params || {};
  const [downloading, setDownloading] = useState(false);
  const [detailedInvoice, setDetailedInvoice] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Combine tapped item data with any extra print details
  const tappedRaw = invoice?._raw || {};
  const raw = { ...tappedRaw, ...detailedInvoice };

  // Database invoice ID required by backend APIs (e.g. 2440)
  const invoiceId = tappedRaw.invoice_id || invoice?.invoice_id || invoice?.id || raw.invoice_id || 'N/A';
  // Human readable invoice / sequence number for display (e.g. 1078 or SCD/IP/25/0305)
  const invoiceNo = tappedRaw.location_Wise_Invoice_no || tappedRaw.invoice_sequence_number || tappedRaw.invoice_no || invoice?.invoiceNo || invoiceId;
  const displayId = tappedRaw.ipdAbirvationId || `#${invoiceNo}`;

  // Fetch full print details on mount
  useEffect(() => {
    async function fetchDetails() {
      if (!invoiceId || invoiceId === 'N/A') return;
      try {
        setLoadingDetails(true);
        const invoicePid = tappedRaw.patientid || tappedRaw.patientId || tappedRaw.patient_id || invoice?.patientId || invoice?.patient_id;
        const storedPid = (await AsyncStorage.getItem('patientId')) || (await AsyncStorage.getItem('clientId'));
        const patientId = Number(invoicePid || storedPid || 0);

        console.log('[InvoiceDetailScreen] Fetching print details for DB invoice_id:', invoiceId, 'patientId:', patientId);
        const res = await InvoiceApi.getPrintDetails(patientId, invoiceId);
        if (res?.success && res?.data) {
          const detailData = res.data.data || res.data;
          console.log('[InvoiceDetailScreen] Successfully loaded invoice print details for invoice:', invoiceId);
          setDetailedInvoice(prev => ({ ...prev, ...detailData }));
        }
      } catch (err) {
        console.log('[InvoiceDetailScreen] Error fetching print details:', err.message);
      } finally {
        setLoadingDetails(false);
      }
    }

    fetchDetails();
  }, [invoiceId]);

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No invoice details found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Charges breakdown & payment logs
  const chargeTransactions = raw.chargeTransaction || [];
  const paymentLogs = raw.payment_log || [];

  // Financial values
  const rawAmount = Number(invoice.rawAmount ?? raw.net_amount ?? raw.totalAmount ?? raw.invoice_amount ?? 0);
  const paidAmount = Number(invoice.paidAmount ?? raw.paid_amount ?? rawAmount);
  const balance = Number(invoice.balance ?? raw.balance_amount ?? Math.max(0, rawAmount - paidAmount));
  const discountAmount = Number(raw.discount_amount ?? 0);
  const discountPercent = Number(raw.discount_percent ?? 0);

  // Request storage permission for Downloads directory
  const checkStoragePermission = async () => {
    if (Platform.OS === 'android') {
      // Android 13+ uses scoped storage for Downloads
      if (Platform.Version >= 33) {
        return true; // No permission needed for Downloads on Android 13+
      }
      
      // For Android 10-12, check/request WRITE_EXTERNAL_STORAGE
      try {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (granted) return true;
        
        // Request permission if not granted
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'SmartCare needs access to save invoice files to your Downloads folder.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  // Download Invoice PDF and save to Form API
  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save the invoice.');
        setDownloading(false);
        return;
      }

      // Prioritize the invoice's own patientId over generic stored ID so we never get another patient's data
      const invoicePid = raw.patientid || raw.patientId || raw.patient_id || invoice?.patientId || invoice?.patient_id;
      const storedPid = (await AsyncStorage.getItem('patientId')) || (await AsyncStorage.getItem('clientId'));
      const patientId = Number(invoicePid || storedPid || 0);

      console.log('[InvoiceDetailScreen] Using verified patientId for invoice:', patientId);

      // 1. Fetch latest print details if needed
      let fullDetail = { ...raw };
      try {
        console.log('[InvoiceDetailScreen] Calling getPrintDetails API with patientId:', patientId, 'invoiceId:', invoiceId);
        const printRes = await InvoiceApi.getPrintDetails(patientId, invoiceId);
        if (printRes?.success && printRes?.data) {
          const detailData = printRes.data.data || printRes.data;
          fullDetail = { ...fullDetail, ...detailData };
          setDetailedInvoice(prev => ({ ...prev, ...detailData }));
        }
      } catch (err) {
        console.log('[InvoiceDetailScreen] Could not refresh print details before download:', err.message);
      }

      // 2. Generate XHTML string code for this specific patient
      const htmlContent = generateInvoiceHtml(fullDetail);
      console.log('[InvoiceDetailScreen] Generated XHTML content length:', htmlContent.length);

      // 3. Save Form HTML to master patient form save endpoint with unique title to prevent collisions
      const safeInvNo = String(invoiceNo).replace(/[^a-zA-Z0-9_-]/g, '_');
      const formTitle = `INVOICE_${patientId}_${safeInvNo}`;

      const formPayload = {
        formTitle,
        patientId,
        htmlContent,
      };

      console.log('[InvoiceDetailScreen] Submitting invoice form to backend save API with patientId:', patientId, 'formTitle:', formTitle);
      const saveRes = await InvoiceApi.saveInvoiceForm(patientId, formPayload);
      console.log('[InvoiceDetailScreen] Save Form API result:', JSON.stringify(saveRes));

      // Wait a moment for server to finish PDF conversion to disk
      await new Promise(resolve => setTimeout(resolve, 1200));

      // 4. Download document PDF from downloadDocuments API with EXACT same patientId and unique filename
      const clinicId = (await AsyncStorage.getItem('CLINICID')) || 'aureus';
      const returnedFileName = saveRes?.data?.fileName || saveRes?.data?.data?.fileName || saveRes?.data?.data?.documentPath;

      const primaryDocUrl = returnedFileName
        ? (returnedFileName.startsWith('http') ? returnedFileName : `https://saas.smartcarehis.com:8443/HISDATA/liveData/${clinicId}/documents/${returnedFileName}`)
        : `https://saas.smartcarehis.com:8443/HISDATA/liveData/${clinicId}/documents/${formTitle}.pdf`;

      const secondaryDocUrl = `http://192.168.1.194:9090/HISDATA/liveData/${clinicId}/documents/${formTitle}.pdf`;

      console.log('[InvoiceDetailScreen] Requesting document download with patientId:', patientId, 'file:', primaryDocUrl);

      let docRes = await InvoiceApi.downloadDocuments(patientId, primaryDocUrl);
      console.log('[InvoiceDetailScreen] DownloadDocuments primary response status:', docRes?.success);

      // If primary returns empty/error, attempt with the secondary direct HISDATA port
      let rawData = docRes?.data?.base64 || docRes?.data?.pdfData || docRes?.data?.pdfBase64 || docRes?.data?.document || docRes?.data?.data || docRes?.data?.rawData || (typeof docRes?.data === 'string' ? docRes.data : null);

      if (!rawData || (typeof rawData === 'string' && rawData.length < 50)) {
        console.log('[InvoiceDetailScreen] Retrying downloadDocuments with fallback URL:', secondaryDocUrl);
        const retryRes = await InvoiceApi.downloadDocuments(patientId, secondaryDocUrl);
        if (retryRes?.success && retryRes?.data) {
          docRes = retryRes;
          rawData = docRes?.data?.base64 || docRes?.data?.pdfData || docRes?.data?.pdfBase64 || docRes?.data?.document || docRes?.data?.data || docRes?.data?.rawData || (typeof docRes?.data === 'string' ? docRes.data : null);
        }
      }

      let downloadDir = `${RNFS.DownloadDirectoryPath}/SmartCare/Invoices`;

      // Create directory with proper error handling
      try {
        await RNFS.mkdir(downloadDir, { NSURLIsExcludedFromBackupKey: false });
        console.log('[InvoiceDetailScreen] Created directory:', downloadDir);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('[InvoiceDetailScreen] Directory already exists:', downloadDir);
        } else {
          console.log('[InvoiceDetailScreen] Directory creation error:', err);
          // Try fallback to Downloads root if subfolder fails
          const fallbackDir = RNFS.DownloadDirectoryPath;
          downloadDir = fallbackDir;
        }
      }

      const cleanPatientName = String(raw.patient_name || raw.patientName || 'Patient')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      const rawDate = String(raw.invoice_date_time || raw.invoiceDate || invoice.date || '')
        .trim()
        .split(' ')[0]
        .replace(/[^a-zA-Z0-9-]/g, '_');
      const cleanDate = rawDate || new Date().toISOString().split('T')[0];

      const pdfFileName = `Invoice_${cleanDate}_${cleanPatientName}_${safeInvNo}.pdf`;
      const pdfFilePath = `${downloadDir}/${pdfFileName}`;

      let pdfSaved = false;

      if (docRes?.success && docRes?.data) {
        const resData = docRes.data;

        // 1. Check if URL is returned
        const pdfUrl = resData.pdfUrl || resData.fileUrl || resData.url || (typeof resData === 'string' && resData.startsWith('http') ? resData : null);
        if (pdfUrl) {
          console.log('[InvoiceDetailScreen] Downloading PDF from URL:', pdfUrl);
          const downloadResult = await RNFS.downloadFile({
            fromUrl: pdfUrl,
            toFile: pdfFilePath,
            background: true,
            discretionary: true,
          }).promise;

          if (downloadResult.statusCode === 200) {
            pdfSaved = true;
          }
        }

        // 2. Check if base64 or raw string is returned
        if (!pdfSaved && rawData) {
          const base64Str = toBase64(typeof rawData === 'string' ? rawData : JSON.stringify(rawData));
          if (base64Str && base64Str.length > 50) {
            console.log('[InvoiceDetailScreen] Writing base64 PDF (length: ' + base64Str.length + ') to:', pdfFilePath);
            await RNFS.writeFile(pdfFilePath, base64Str, 'base64');
            pdfSaved = true;
          }
        }
      }

      // Check fallback from saveRes if downloadDocuments didn't return data
      if (!pdfSaved && saveRes?.success && saveRes?.data) {
        const sData = saveRes.data.data || saveRes.data;
        const pdfUrl = sData.pdfUrl || sData.fileUrl || sData.url;
        const pdfBase64 = sData.pdfData || sData.base64 || sData.rawData;

        if (pdfUrl) {
          const downloadResult = await RNFS.downloadFile({
            fromUrl: pdfUrl,
            toFile: pdfFilePath,
            background: true,
            discretionary: true,
          }).promise;
          if (downloadResult.statusCode === 200) pdfSaved = true;
        } else if (pdfBase64) {
          const b64 = toBase64(String(pdfBase64));
          if (b64) {
            await RNFS.writeFile(pdfFilePath, b64, 'base64');
            pdfSaved = true;
          }
        }
      }

      if (pdfSaved) {
        Alert.alert(
          'Download Complete',
          `Invoice PDF successfully downloaded!\n\nLocation: Internal Storage > Download > SmartCare > Invoices\nFile: ${pdfFileName}`,
          [{ text: 'OK' }],
        );
      } else {
        const errMsg = docRes?.error || saveRes?.error || 'Could not retrieve PDF data from server.';
        Alert.alert('Download Issue', `Server response: ${errMsg}`);
      }
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
          style={[styles.topDownloadBtn, downloading && { opacity: 0.6 }]}
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
                { backgroundColor: raw.invoice_type === 'IPD' ? '#FEE2E2' : '#DBEAFE' },
              ]}>
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: raw.invoice_type === 'IPD' ? '#EF4444' : '#3B82F6' },
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
            {invoice.amount || `₹${rawAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </Text>
          <View style={styles.amountBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Paid Amount</Text>
              <Text style={[styles.breakdownValue, { color: colors.success }]}>
                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Balance</Text>
              <Text
                style={[
                  styles.breakdownValue,
                  { color: balance > 0 ? colors.warning : colors.textMuted },
                ]}>
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Discount ({discountPercent}%)</Text>
                <Text style={[styles.breakdownValue, { color: colors.success }]}>
                  -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    ₹{Number(charge.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                {charge.charge_list?.map((item, i) => (
                  <View key={i} style={styles.chargeItem}>
                    <Text style={styles.chargeItemName}>• {item.chargename || 'Service'}</Text>
                    <Text style={styles.chargeItemAmount}>
                      ₹{Number(item.charge_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} × {item.quantity || 1}
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

        {/* 7. CLINICAL DETAILS (if present) */}
        {(() => {
          const mapped = mapInvoiceRecord(raw) || {};
          const clinicalFields = mapped.clinical || [];
          if (clinicalFields.length === 0) return null;
          return (
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>CLINICAL DETAILS</Text>
              {clinicalFields.map((f, i) => (
                <InfoRow key={i} icon={DocumentIcon} label={f.label} value={f.value} />
              ))}
            </View>
          );
        })()}

        {/* 8. ADDITIONAL DETAILS (Dynamic Fields) */}
        {(() => {
          const mapped = mapInvoiceRecord(raw) || {};
          const extraFields = mapped.extra || [];
          if (extraFields.length === 0) return null;
          return (
            <View style={styles.infoSection}>
              <Text style={styles.sectionLabel}>ADDITIONAL DETAILS</Text>
              {extraFields.map((f, i) => (
                <InfoRow key={i} icon={DocumentIcon} label={f.label} value={f.value} />
              ))}
            </View>
          );
        })()}

        {/* 9. PAYMENT HISTORY */}
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
                  ₹{Number(log.part_payment_amount || log.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 10. Note if available */}
        {raw.invoice_note && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Note</Text>
            <Text style={styles.noteText}>{raw.invoice_note}</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
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
