import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, PermissionsAndroid} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';
import {ArrowBackIcon, CalendarIcon, DownloadIcon, ClipboardIcon, HospitalBuildingIcon} from '../../assets/icons/Icons';
import {useApp} from '../../context/AppContext';
import { InvestigationApi } from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

export default function InvestigationReportScreen({navigation, route}) {
  const {report} = route.params;
  const {user} = useApp();
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailedReport, setDetailedReport] = useState(null);
  const [error, setError] = useState('');

  // Fetch detailed investigation report on mount
  useEffect(() => {
    fetchDetailedReport();
  }, []);

  const fetchDetailedReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const clientId = await AsyncStorage.getItem('clientId');
      const payload = {
        investigationParentId: report._raw?.parentId || report.id,
        gender: report._raw?.gender || user?.gender || 'Male'
      };

      console.log('[InvestigationReport] Fetching details with payload:', payload);
      
      const response = await InvestigationApi.print(clientId, payload);
      
      console.log('[InvestigationReport] Response:', response);

      if (response.success && response.data?.data) {
        setDetailedReport(response.data.data);
      } else {
        setError('Could not load report details');
      }
    } catch (err) {
      console.error('[InvestigationReport] Error fetching details:', err);
      setError('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  // Download PDF from server
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

      // STEP 1: Fetch the FULL investigation detail record first.
      // report._raw only has 4 fields (parentId, gender, patientName, investigationName) —
      // nowhere near enough for PDF generation. The `print` endpoint returns the
      // complete ~90-field record (parameterlist, sectionName, signatures, etc.)
      const detailResponse = await InvestigationApi.print(clientId, {
        investigationParentId: report._raw.parentId,
        gender: report._raw.gender,
      });

      console.log('📥 Detail (print) response:', JSON.stringify(detailResponse));

      if (!detailResponse.success || !detailResponse.data?.data) {
        Alert.alert('Error', 'Could not load full report details for PDF generation.');
        setDownloading(false);
        return;
      }

      // Response is wrapped: { data: { investigationId, parameterlist, ... }, error, status_code }
      const fullReport = detailResponse.data.data;

      const clinicId = await AsyncStorage.getItem('CLINICID') || 'aureus';
      const lowerClinicId = clinicId.toLowerCase();

      // STEP 2: Build payload for PDF generation from the FULL detail object,
      // not from the list item (`report`) which is missing almost everything.
      const pdfPayload = {
        ...fullReport, // all real report fields: parameterlist, sectionName, etc.
        Website: fullReport.Website || fullReport.website || (lowerClinicId === 'aureus' ? "aureushospital.com" : "smartcarehis.com"),
        clinicAddress: fullReport.clinicAddress || "Nagpur",
        clinicEmail: fullReport.clinicEmail || (lowerClinicId === 'aureus' ? "info@aureus.in" : `info@${lowerClinicId}.in`),
        clinicName: fullReport.clinicName || (lowerClinicId === 'aureus' ? "Aureus Hospital" : "SmartCare Hospital"),
        phoneNo: fullReport.phoneNo || "0223-2820300",
        imagePath: fullReport.imagePath || `https://saas.smartcarehis.com:8443/HISDATA/liveData/locationImage/${lowerClinicId}.jpg`,
        qrCodePath: fullReport.qrCodePath || "",
        isChild: fullReport.isChild || false,
        paymentUpId: fullReport.paymentUpId || "",
        payee: fullReport.payee || "Self",
        patientName: fullReport.patientName || user?.name || '',
        gender: fullReport.gender || user?.gender || 'Male',
        age: fullReport.age || user?.age || '',
        patientAge: fullReport.patientAge || fullReport.age || user?.age || '',
      };

      console.log('📥 Calling generateInvReportPDF API with payload:', JSON.stringify(pdfPayload, null, 2));

      const pdfResponse = await InvestigationApi.generateInvReportPDF(clientId, pdfPayload);

      console.log('📥 PDF Response:', pdfResponse);

      if (pdfResponse.success && pdfResponse.data) {
        // Use Downloads directory for all platforms and versions
        let downloadDir = `${RNFS.DownloadDirectoryPath}/SmartCare/Investigation`;

        // Ensure directory exists with better error handling
        try {
          await RNFS.mkdir(downloadDir, {
            NSURLIsExcludedFromBackupKey: false // iOS: allow iCloud backup
          });
          console.log('📁 Created directory:', downloadDir);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.log('📁 Directory creation error:', err);
            // Fallback to Downloads root directory
            downloadDir = RNFS.DownloadDirectoryPath;
          }
        }

        // Generate filename with timestamp and patient name
        const timestamp = new Date().getTime();
        const patientName = (report.patientName || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Investigation_${patientName}_${timestamp}.pdf`;
        const filePath = `${downloadDir}/${fileName}`;

        console.log('📥 Saving PDF to:', filePath);

        // Download the PDF from URL or save base64 data
        if (pdfResponse.data.pdfUrl) {
          // Download from URL
          const downloadResult = await RNFS.downloadFile({
            fromUrl: pdfResponse.data.pdfUrl,
            toFile: filePath,
            background: true,
            discretionary: true,
            progress: (res) => {
              const progress = (res.bytesWritten / res.contentLength) * 100;
              console.log(`Download progress: ${progress.toFixed(2)}%`);
            }
          }).promise;

          if (downloadResult.statusCode === 200) {
            Alert.alert(
              'Download Complete',
              `PDF saved to:\nInternal Storage > Download > SmartCare > Investigation\n\nFile: ${fileName}`,
              [
                { text: 'OK', style: 'default' }
              ]
            );
          } else {
            throw new Error('Download failed with status: ' + downloadResult.statusCode);
          }
        } else if (pdfResponse.data.pdfData || pdfResponse.data.base64) {
          // Save base64 PDF data
          const base64Data = pdfResponse.data.pdfData || pdfResponse.data.base64;
          await RNFS.writeFile(filePath, base64Data, 'base64');
          
          Alert.alert(
            'Download Complete',
            `PDF saved to:\nInternal Storage > Download > SmartCare > Investigation\n\nFile: ${fileName}`,
            [
              { text: 'OK', style: 'default' }
            ]
          );
        } else {
          // Fallback: API might return PDF buffer or other format
          Alert.alert('Success', 'PDF has been generated. Please check your downloads folder.');
        }
      } else {
        Alert.alert('Error', pdfResponse.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF Download Error:', error);
      Alert.alert('Error', 'Failed to download PDF. Please try again.');
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