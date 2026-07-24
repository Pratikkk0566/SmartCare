import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import RNBlobUtil from 'react-native-blob-util';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';
import {ArrowBackIcon, DownloadIcon} from '../../assets/icons/Icons';

export default function InvestigationReportScreen({navigation, route}) {
  const {report} = route.params;
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  // Replace report.pdfUrl with your API URL when ready
  const pdfUrl = report.pdfUrl || 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf';

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const fileName = `${report.name.replace(/\s+/g, '_')}.pdf`;
      const dirs = RNBlobUtil.fs.dirs;
      const path = `${Platform.OS === 'android' ? dirs.DownloadDir : dirs.DocumentDir}/${fileName}`;

      await RNBlobUtil.config({
        fileCache: true,
        path,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: fileName,
          description: `Downloading ${report.name}`,
          mime: 'application/pdf',
          mediaScannable: true,
        },
      }).fetch('GET', pdfUrl);

      Alert.alert('Downloaded!', `${report.name} has been saved to your Downloads folder.`);
    } catch {
      Alert.alert('Download Failed', 'Could not download the file. Please try again.');
    } finally {
      setDownloading(false);
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

      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {loading && !error && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Loading report...</Text>
          </View>
        )}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to Load Report</Text>
            <Text style={styles.errorSub}>The PDF could not be loaded. It may not be available yet or requires an internet connection.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => {setError(false); setLoading(true);}}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Pdf
            source={{uri: pdfUrl, cache: true}}
            style={styles.pdf}
            onLoadComplete={() => setLoading(false)}
            onError={() => {setLoading(false); setError(true);}}
            trustAllCerts={false}
          />
        )}
      </View>

      {/* Download Bar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
          onPress={handleDownload}
          disabled={downloading || error}
          activeOpacity={0.85}>
          {downloading
            ? <ActivityIndicator size="small" color="#fff" />
            : <DownloadIcon size={18} color="#fff" />}
          <Text style={styles.downloadText}>
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Text>
        </TouchableOpacity>
      </View>
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
  pdfContainer: {flex: 1},
  pdf: {flex: 1, width: '100%', backgroundColor: colors.background},
  loader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background,
  },
  loaderText: {marginTop: spacing.sm, fontSize: 14, color: colors.textSecondary},
  errorContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  errorTitle: {fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  errorSub: {fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl},
  retryBtn: {backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 12},
  retryText: {color: '#fff', fontWeight: '700', fontSize: 14},
  footer: {
    padding: spacing.base, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  downloadBtn: {
    backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
    borderRadius: 14, ...shadows.md,
  },
  downloadBtnDisabled: {backgroundColor: colors.textMuted},
  downloadText: {fontSize: 15, fontWeight: '700', color: '#fff'},
});