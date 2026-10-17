import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, PermissionsAndroid} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';
import {ArrowBackIcon, CalendarIcon, DownloadIcon, ClipboardIcon, HospitalBuildingIcon} from '../../assets/icons/Icons';
import {useApp} from '../../context/AppContext';
import { InvestigationApi, ClinicApi } from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { generateInvestigationHtml } from '../../utils/invoiceHtmlGenerator';

/**
 * Extract and format date for PDF filename
 * Returns format: DDMmmYY (e.g., 25Jan26)
 */
function formatDateForFilename(dateValue) {
  if (!dateValue) return null;
  
  try {
    let dateObj;
    
    if (dateValue instanceof Date) {
      dateObj = dateValue;
    } else if (typeof dateValue === 'string') {
      dateObj = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      dateObj = new Date(dateValue);
    } else {
      return null;
    }
    
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[dateObj.getMonth()];
    const year = String(dateObj.getFullYear()).slice(-2);
    
    return `${day}${month}${year}`;
  } catch (error) {
    console.log('[formatDateForFilename] Error:', error);
    return null;
  }
}

export default function InvestigationReportScreen({navigation, route}) {
  const {report} = route.params;
  const {user} = useApp();
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailedReport, setDetailedReport] = useState(null);
  const [letterheadData, setLetterheadData] = useState(null);
  const [error, setError] = useState('');

  // Fetch detailed investigation report on mount
  useEffect(() => {
    fetchDetailedReport();
  }, []);

  const fetchDetailedReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('[InvestigationReport] 🔍 Trying to load report details...');
      console.log('[InvestigationReport] Report data:', report);
      
      // Fetch clinic letterhead (branchId = 1 hardcoded)
      console.log('[InvestigationReport] Fetching clinic letterhead...');
      const letterheadRes = await ClinicApi.getLetterhead();
      if (letterheadRes?.success && letterheadRes?.data) {
        console.log('[InvestigationReport] ✅ Letterhead fetched successfully');
        setLetterheadData(letterheadRes.data);
      } else {
        console.log('[InvestigationReport] ⚠️ Letterhead fetch failed:', letterheadRes?.error);
      }
      
      // Try to fetch from API
      const clientId = await AsyncStorage.getItem('clientId');
      const payload = {
        investigationParentId: report._raw?.parentId || report.id || report.parentId,
        gender: report._raw?.gender || user?.gender || 'Male'
      };

      console.log('[InvestigationReport] Fetching details with payload:', payload);
      
      const response = await InvestigationApi.print(clientId, payload);
      
      console.log('[InvestigationReport] Response:', response);

      if (response.success && response.data?.data) {
        console.log('[InvestigationReport] ✅ API SUCCESS: Got fresh report details');
        setDetailedReport(response.data.data);
      } else {
        console.log('[InvestigationReport] ❌ API failed');
        setError('Could not load report details - no internet connection');
      }
    } catch (err) {
      console.error('[InvestigationReport] Error fetching details:', err);
      setError('Failed to load report details - check internet connection');
    } finally {
      setLoading(false);
    }
  };

  // Download PDF from server using SAME FLOW AS INVOICE GENERATION
  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);

      // Request storage permission for Android
      if (Platform.OS === 'android') {
        console.log('🔐 Checking storage permission...');
        const granted = await requestStoragePermission();
        console.log('🔐 Permission granted:', granted);
        if (!granted) {
          Alert.alert(
            'Permission Required', 
            'Storage permission is needed to download PDF files to your device.',
            [{ text: 'OK' }]
          );
          setDownloading(false);
          return;
        }
        console.log('🔐 Permission check passed, proceeding with download...');
      }

      const clientId = await AsyncStorage.getItem('clientId');
      const patientId = await AsyncStorage.getItem('patientId');
      const clinicId = await AsyncStorage.getItem('CLINICID') || 'aureus';

      // STEP 1: Fetch the FULL investigation detail record
      console.log('[Investigation PDF] 📥 Fetching full report details...');
      const detailResponse = await InvestigationApi.print(clientId, {
        investigationParentId: report._raw.parentId,
        gender: report._raw.gender,
      });

      console.log('[Investigation PDF] Detail response:', JSON.stringify(detailResponse, null, 2));

      if (!detailResponse.success || !detailResponse.data?.data) {
        Alert.alert('Error', 'Could not load full report details for PDF generation.');
        setDownloading(false);
        return;
      }

      const fullReport = detailResponse.data.data;

      // STEP 2: Generate HTML locally using generateInvestigationHtml (SAME AS INVOICE)
      console.log('[Investigation PDF] 🎨 Generating HTML locally...');
      
      // Build logo URL from letterhead data (clinicId already declared above)
      let logoUrl = '';
      if (letterheadData) {
        console.log('[Investigation PDF] Letterhead data received:', JSON.stringify(letterheadData).slice(0, 300));
        
        // Extract letterhead record (can be array or object)
        const letterheadRecord = Array.isArray(letterheadData?.letterheadDetails) 
          ? letterheadData.letterheadDetails[0]
          : Array.isArray(letterheadData)
          ? letterheadData[0]
          : letterheadData;
        
        console.log('[Investigation PDF] Extracted letterhead record:', {
          hospname: letterheadRecord?.hospname,
          subtitle: letterheadRecord?.subtitle,
          address: letterheadRecord?.address,
          city: letterheadRecord?.city,
          clinicLogo: letterheadRecord?.clinicLogo
        });
        
        if (letterheadRecord?.clinicLogo) {
          // Convert relative path to absolute URL
          const logoPath = letterheadRecord.clinicLogo;
          logoUrl = logoPath.startsWith('http') 
            ? logoPath 
            : `https://saas.smartcarehis.com:8443/${logoPath}`;
          console.log('[Investigation PDF] Logo URL:', logoUrl);
        }
      } else {
        console.log('[Investigation PDF] ⚠️ No letterhead data available');
      }
      
      const htmlContent = generateInvestigationHtml(fullReport, {
        letterhead: letterheadData,
        logoUrl: logoUrl,
        copyLabel: 'PATIENT COPY'
      });

      console.log('[Investigation PDF] HTML options passed:', {
        hasLetterhead: !!letterheadData,
        logoUrl: logoUrl,
        copyLabel: 'PATIENT COPY'
      });

      if (!htmlContent) {
        Alert.alert('Error', 'Failed to generate investigation HTML.');
        setDownloading(false);
        return;
      }

      console.log('[Investigation PDF] ✅ HTML generated successfully, length:', htmlContent.length);

      // STEP 3: Generate PDF filename: TestName_ReqID.pdf (using request ID instead of date)
      // Request ID is more reliable than date fields
      const requestId = fullReport.investigationrequestId || 
                       fullReport.investigationId ||
                       fullReport.requestNumber ||
                       report.investigationrequestId ||
                       report.id ||
                       'REQ';
      
      // Clean request ID
      const cleanReqId = String(requestId)
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 15);
      
      // Get short test name (e.g., CBC, HbA1c, XRay)
      const testName = (fullReport.testName || fullReport.investigationName || report.name || 'Test')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 20);
      
      const formTitle = `${testName}_${cleanReqId}`;
      
      console.log('[Investigation PDF] 📄 Final PDF Name:', `${formTitle}.pdf`, '(Test:', testName, ', Req ID:', cleanReqId, ')');
      console.log('[Investigation PDF] 💾 Saving HTML form to server...');
      const saveResponse = await InvestigationApi.saveInvestigationForm(clientId, {
        formTitle,
        patientId: Number(patientId || clientId),
        htmlContent,
      });

      console.log('[Investigation PDF] Save response:', JSON.stringify(saveResponse, null, 2));

      if (!saveResponse.success) {
        Alert.alert('Error', saveResponse.error || 'Failed to save investigation form to server.');
        setDownloading(false);
        return;
      }

      // STEP 4: Download PDF from server (SAME AS INVOICE downloadDocuments)
      console.log('[Investigation PDF] 📥 Downloading PDF from server...');
      const pdfFileName = `https://saas.smartcarehis.com:8443/HISDATA/liveData/${clinicId}/documents/${formTitle}.pdf`;
      
      const downloadResponse = await InvestigationApi.downloadDocuments(clientId, pdfFileName);

      console.log('[Investigation PDF] Download response:', downloadResponse);

      if (!downloadResponse.success || !downloadResponse.data) {
        Alert.alert('Error', downloadResponse.error || 'Failed to download PDF from server.');
        setDownloading(false);
        return;
      }

      // STEP 5: Save PDF to device storage
      let downloadDir = `${RNFS.DownloadDirectoryPath}/SmartCare/Investigation`;

      try {
        await RNFS.mkdir(downloadDir, {
          NSURLIsExcludedFromBackupKey: false
        });
        console.log('[Investigation PDF] 📁 Created directory:', downloadDir);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log('[Investigation PDF] 📁 Directory creation error:', err);
          downloadDir = RNFS.DownloadDirectoryPath;
        }
      }

      const patientName = (fullReport.patientName || report.patientName || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${formTitle}.pdf`;  // Use the same formTitle we created earlier
      const filePath = `${downloadDir}/${fileName}`;

      console.log('[Investigation PDF] 💾 Saving PDF to:', filePath);

      // Extract base64 data from response (can be in data.base64 or directly in data)
      let base64Data = downloadResponse.data.base64 || downloadResponse.data;
      
      // If it's still an object, try to stringify and check
      if (typeof base64Data === 'object') {
        console.log('[Investigation PDF] Response data is object, keys:', Object.keys(base64Data));
        base64Data = base64Data.base64 || base64Data.pdfData || base64Data.data || '';
      }
      
      // Remove data URI prefix if present
      if (typeof base64Data === 'string') {
        base64Data = base64Data.replace(/^data:application\/pdf;base64,/, '');
      }

      if (!base64Data || typeof base64Data !== 'string') {
        Alert.alert('Error', 'Invalid PDF data received from server.');
        setDownloading(false);
        return;
      }

      await RNFS.writeFile(filePath, base64Data, 'base64');
      
      Alert.alert(
        'Download Complete',
        `PDF saved to:\nInternal Storage > Download > SmartCare > Investigation\n\nFile: ${fileName}`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('[Investigation PDF] ERROR:', error);
      Alert.alert('Error', `Failed to download PDF: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // Request storage permission for Downloads directory
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      console.log('🔐 Android API Level:', Platform.Version);
      
      // Android 13+ has scoped storage for Downloads
      if (Platform.Version >= 33) {
        console.log('🔐 Android 13+: Using Downloads directory (scoped storage)');
        return true;
      }
      
      // Android 10-12 needs WRITE_EXTERNAL_STORAGE for Downloads
      console.log('🔐 Android 10-12: Checking WRITE_EXTERNAL_STORAGE permission...');
      
      // Check if permission is already granted
      const checkResult = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      
      console.log('🔐 Permission already granted?', checkResult);
      
      if (checkResult) {
        console.log('🔐 Permission already granted, proceeding');
        return true;
      }
      
      // Request permission
      console.log('🔐 Requesting WRITE_EXTERNAL_STORAGE permission...');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'SmartCare needs permission to save PDF files to your Downloads folder.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );
      
      console.log('🔐 Permission request result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
      
    } catch (err) {
      console.error('🔐 Permission error:', err);
      Alert.alert('Permission Error', `Failed to request storage permission: ${err.message}`);
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Investigation Report</Text>
          <Text style={styles.headerSub}>View and download your medical report</Text>
        </View>
      </View>

      {/* Report Details */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={{alignItems: 'center', paddingVertical: 48}}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{marginTop: 12, fontSize: 13, color: colors.textSecondary}}>Loading report details...</Text>
          </View>
        ) : error ? (
          <View style={{alignItems: 'center', paddingVertical: 48}}>
            <Text style={{fontSize: 14, color: '#EF4444', textAlign: 'center', marginBottom: 16}}>{error}</Text>
            <TouchableOpacity 
              onPress={fetchDetailedReport}
              style={{paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary}}>
              <Text style={{color: '#fff', fontWeight: '700'}}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reportCard}>
            <View style={styles.reportIconContainer}>
              <ClipboardIcon size={48} color={colors.primary} />
            </View>
            
            <Text style={styles.reportTitle}>{detailedReport?.testName || report.name}</Text>
            
            {/* Basic Info */}
            <View style={styles.reportDetails}>
              {detailedReport?.sectionName && (
                <Text style={styles.detailText}>{detailedReport.sectionName}</Text>
              )}
              <Text style={styles.detailText}>{report.date}</Text>
              <Text style={styles.detailText}>{report.location}</Text>
            </View>
            
            {report.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{report.category}</Text>
              </View>
            )}
            
            {report.status && (
              <View style={[styles.statusBadge, 
                report.status.toLowerCase() === 'completed' && styles.statusCompleted,
                report.status.toLowerCase() === 'pending' && styles.statusPending
              ]}>
                <Text style={styles.statusText}>{report.status}</Text>
              </View>
            )}

            {/* Patient Information */}
            {detailedReport && (
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Patient Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{detailedReport.patientName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>UHID:</Text>
                  <Text style={styles.infoValue}>{detailedReport.uhid}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age / Gender:</Text>
                  <Text style={styles.infoValue}>{detailedReport.age} Years / {detailedReport.gender}</Text>
                </View>
                {detailedReport.contactNo && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Contact:</Text>
                    <Text style={styles.infoValue}>{detailedReport.contactNo}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Test Information */}
            {detailedReport && (
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Test Information</Text>
                {detailedReport.practitionerName && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Practitioner:</Text>
                    <Text style={styles.infoValue}>{detailedReport.practitionerName}</Text>
                  </View>
                )}
                {detailedReport.referalName && detailedReport.referalName !== '0' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Referred By:</Text>
                    <Text style={styles.infoValue}>{detailedReport.referalName}</Text>
                  </View>
                )}
                {detailedReport.requestedDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Requested:</Text>
                    <Text style={styles.infoValue}>{detailedReport.requestedDate}</Text>
                  </View>
                )}
                {detailedReport.collectedDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Collected:</Text>
                    <Text style={styles.infoValue}>{detailedReport.collectedDate}</Text>
                  </View>
                )}
                {detailedReport.completedDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Completed:</Text>
                    <Text style={styles.infoValue}>{detailedReport.completedDate}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Test Parameters */}
            {detailedReport?.parameterlist && detailedReport.parameterlist.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Test Parameters ({detailedReport.parameterlist.length})</Text>
                {detailedReport.parameterlist.slice(0, 5).map((param, index) => (
                  <View key={index} style={styles.parameterCard}>
                    <View style={styles.parameterHeader}>
                      <Text style={styles.parameterName}>{param.parameterName}</Text>
                      <View style={styles.parameterValueBox}>
                        <Text style={styles.parameterValue}>{param.totalObtainedValue}</Text>
                        <Text style={styles.parameterUnit}> {param.parameterUnit}</Text>
                      </View>
                    </View>
                    {param.normalValue && param.normalValue !== '-' && (
                      <Text style={styles.parameterNormal} numberOfLines={2}>
                        Normal: {param.normalValue.substring(0, 100)}{param.normalValue.length > 100 ? '...' : ''}
                      </Text>
                    )}
                    {param.criticalValueFlag && (
                      <View style={[styles.criticalBadge, {backgroundColor: '#FEE2E2'}]}>
                        <Text style={[styles.criticalText, {color: '#EF4444'}]}>
                          {param.criticalValueFlag} Critical
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {detailedReport.parameterlist.length > 5 && (
                  <Text style={{fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm}}>
                    + {detailedReport.parameterlist.length - 5} more parameters in the full report
                  </Text>
                )}
              </View>
            )}
            
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Download Full Report</Text>
              <Text style={styles.infoText}>
                Download the complete investigation report as a PDF document with all test parameters, results, and medical interpretations.
              </Text>
            </View>

            {/* Download Button */}
            <TouchableOpacity
              style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
              onPress={handleDownloadPDF}
              disabled={downloading}
              activeOpacity={0.8}>
              {downloading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.downloadButtonText}>Downloading...</Text>
                </>
              ) : (
                <>
                  <DownloadIcon size={20} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download PDF Report</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Additional Info */}
            <View style={styles.helpText}>
              <Text style={styles.helpTextContent}>
                💡 The PDF will be saved to your device. You can share it with your doctor or use it for insurance claims.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingTop: spacing['4xl'], paddingBottom: spacing.md,
    backgroundColor: colors.surface, ...shadows.sm, gap: spacing.md,
  },
  backBtn: {padding: 4},
  headerInfo: {flex: 1},
  headerTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary},
  headerSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    ...shadows.md,
    alignItems: 'center',
  },
  reportIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  reportDetails: {
    width: '100%',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryBadge: {
    alignSelf: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.xs,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  statusCompleted: {
    backgroundColor: colors.successLight || '#D1FAE5',
  },
  statusPending: {
    backgroundColor: colors.warningLight || '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  downloadButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  helpText: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  helpTextContent: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  
  // New styles for detailed information
  infoSection: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  parameterCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  parameterName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  parameterValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  parameterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  parameterUnit: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  parameterNormal: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  criticalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  criticalText: {
    fontSize: 10,
    fontWeight: '700',
  },
});