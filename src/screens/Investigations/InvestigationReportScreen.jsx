import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, PermissionsAndroid} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';
import {ArrowBackIcon, CalendarIcon, DownloadIcon} from '../../assets/icons/Icons';
import {IconFile, IconBuildingHospital} from '@tabler/icons-react-native';
import {useApp} from '../../context/AppContext';
import { InvestigationApi } from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

export default function InvestigationReportScreen({navigation, route}) {
  const {report} = route.params;
  const {user} = useApp();
  const [downloading, setDownloading] = useState(false);

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

      // STEP 2: Build payload for PDF generation from the FULL detail object,
      // not from the list item (`report`) which is missing almost everything.
      const pdfPayload = {
        ...fullReport, // all real report fields: parameterlist, sectionName, etc.
        Website: fullReport.Website || fullReport.website || "aureushospital.com",
        clinicAddress: fullReport.clinicAddress || "Nagpur",
        clinicEmail: fullReport.clinicEmail || "info@aureus.in",
        clinicName: fullReport.clinicName || "RBI STAFF CLINIC",
        phoneNo: fullReport.phoneNo || "0223-2820300",
        imagePath: fullReport.imagePath || "https://saas.smartcarehis.com:8443/HISDATA/liveData/locationImage/aureus.jpg",
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
        // Create directory structure: Download/SmartCare/Investigation/
        const downloadDir = Platform.OS === 'android' 
          ? `${RNFS.DownloadDirectoryPath}/SmartCare/Investigation`
          : `${RNFS.DocumentDirectoryPath}/SmartCare/Investigation`;

        // Ensure directory exists
        await RNFS.mkdir(downloadDir, {
          NSURLIsExcludedFromBackupKey: false // iOS: allow iCloud backup
        }).catch(err => console.log('Directory already exists or error:', err));

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
              `PDF saved to:\nDownload/SmartCare/Investigation/\n\nFile: ${fileName}`,
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
            `PDF saved to:\nDownload/SmartCare/Investigation/\n\nFile: ${fileName}`,
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

  // Request storage permission for Android
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      console.log('🔐 Android API Level:', Platform.Version);
      
      // Android 13+ (API 33+) - Use scoped storage, no permission needed for app-specific directories
      // But we're writing to public Downloads, so we check if we can write
      if (Platform.Version >= 33) {
        console.log('🔐 Android 13+: Using scoped storage (no permission needed for Downloads)');
        // Android 13+ doesn't need WRITE_EXTERNAL_STORAGE for public Downloads folder
        // The system automatically grants access
        return true;
      }
      
      // Android 10-12 (API 29-32) and below
      console.log('🔐 Android 10-12: Checking if permission already granted...');
      
      // First check if permission is already granted
      const checkResult = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      
      console.log('🔐 Permission already granted?', checkResult);
      
      if (checkResult) {
        console.log('🔐 Permission already granted, no need to request');
        return true;
      }
      
      // Permission not granted, request it
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
          <Text style={styles.headerTitle} numberOfLines={1}>{report.name}</Text>
          <Text style={styles.headerSub}>{report.date} • {report.location}</Text>
        </View>
      </View>

      {/* Report Details */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.reportCard}>
          <View style={styles.reportIconContainer}>
            <IconFile size={48} color={colors.primary} />
          </View>
          
          <Text style={styles.reportTitle}>{report.name}</Text>
          
          <View style={styles.reportDetails}>
            <View style={styles.detailRow}>
              <CalendarIcon size={16} color={colors.textMuted} />
              <Text style={styles.detailText}>{report.date}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <IconBuildingHospital size={16} color={colors.textMuted} />
              <Text style={styles.detailText}>{report.location}</Text>
            </View>
            
            {report.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{report.category}</Text>
              </View>
            )}
          </View>
          
          {report.status && (
            <View style={[styles.statusBadge, 
              report.status.toLowerCase() === 'completed' && styles.statusCompleted,
              report.status.toLowerCase() === 'pending' && styles.statusPending
            ]}>
              <Text style={styles.statusText}>{report.status}</Text>
            </View>
          )}
          
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Report Information</Text>
            <Text style={styles.infoText}>
              Download your investigation report as a PDF document. The report includes all test parameters, results, and medical interpretations.
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
              💡 The PDF will be downloaded to your device. You can share it with your doctor or use it for insurance claims.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
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
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
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
});