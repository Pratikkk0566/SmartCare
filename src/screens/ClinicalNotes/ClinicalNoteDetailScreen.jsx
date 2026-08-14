import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import usePDFGenerator from '../../hooks/usePDFGenerator';
import { useApp } from '../../context/AppContext';
import { ClinicalNotesApi } from '../../API/Api';

const ClinicalNoteDetailScreen = ({ route, navigation }) => {
  const { note } = route.params || {};
  
  // Safety check: if no note data, show error and go back
  if (!note) {
    console.error('[ClinicalNoteDetail] No note data provided');
    setTimeout(() => navigation.goBack(), 100);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading clinical note</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const { userProfile } = useApp();
  const { isGenerating, generateClinicalNotePDF } = usePDFGenerator();
  const [detailedNote, setDetailedNote] = useState(note);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch detailed note data when component mounts
  useEffect(() => {
    fetchDetailedNote();
  }, [note.id]);

  const fetchDetailedNote = async () => {
    // If note already has htmldata, no need to fetch again
    if (note.htmldata && note.htmldata.length > 0) {
      console.log('[ClinicalNoteDetail] Note already has htmldata, skipping fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[ClinicalNoteDetail] Fetching detailed note for ID:', note.id);
      
      const response = await ClinicalNotesApi.getById(note.id);
      
      if (response.success && response.data) {
        console.log('[ClinicalNoteDetail] Successfully fetched detailed note');
        setDetailedNote(response.data);
      } else {
        console.error('[ClinicalNoteDetail] Failed to fetch detailed note:', response.error);
        setError(response.error || 'Failed to load clinical note details');
      }
    } catch (err) {
      console.error('[ClinicalNoteDetail] Error fetching detailed note:', err);
      setError(err.message || 'An error occurred while loading the note');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      await generateClinicalNotePDF(detailedNote, userProfile);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Parse DD-MM-YYYY HH:MM:SS format
      const [datePart, timePart] = dateString.split(' ');
      const [day, month, year] = datePart.split('-');
      const [hours, minutes] = timePart.split(':');
      const date = new Date(`20${year}`, month - 1, day, hours, minutes);
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const parseHtmlTable = (htmlData) => {
    if (!htmlData) return [];
    
    try {
      // Extract table rows from HTML
      const rows = [];
      const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gs;
      const matches = htmlData.match(tableRowRegex);
      
      if (!matches || matches.length === 0) {
        console.log('[ClinicalNoteDetail] No table rows found in HTML');
        return [];
      }
      
      matches.forEach((row, index) => {
        // Skip header row
        if (index === 0) return;
        
        try {
          // More flexible cell extraction - try multiple patterns
          let cells = [];
          
          // Pattern 1: cells with className
          const cellRegexWithClass = /<td[^>]*className="[^"]*">([^<]*)<\/td>/g;
          let match;
          while ((match = cellRegexWithClass.exec(row)) !== null) {
            cells.push(match[1]?.trim() || '');
          }
          
          // Pattern 2: simple td tags if first pattern failed
          if (cells.length === 0) {
            const simpleCellRegex = /<td[^>]*>([^<]*)<\/td>/g;
            while ((match = simpleCellRegex.exec(row)) !== null) {
              cells.push(match[1]?.trim() || '');
            }
          }
          
          if (cells.length >= 3) {
            rows.push({
              diagnosis: cells[0] || 'Not specified',
              problem: cells[1] || 'Not specified', 
              intervention: cells[2] === 'undefined' ? 'Not specified' : cells[2] || 'Not specified'
            });
          }
        } catch (rowError) {
          console.log(`[ClinicalNoteDetail] Error parsing row ${index}:`, rowError);
        }
      });
      
      return rows;
    } catch (error) {
      console.error('[ClinicalNoteDetail] Error parsing HTML table:', error);
      return [];
    }
  };

  // Convert HTML to plain text (similar to website's html-to-text)
  const htmlToPlainText = (htmlData) => {
    if (!htmlData) return 'No content available';
    
    try {
      return htmlData
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
        .replace(/<br\s*\/?>/gi, '\n') // Convert br to newlines
        .replace(/<\/p>/gi, '\n\n') // Convert paragraph ends to double newlines
        .replace(/<\/div>/gi, '\n') // Convert div ends to newlines
        .replace(/<\/tr>/gi, '\n') // Convert table rows to newlines
        .replace(/<\/td>/gi, ' | ') // Convert table cells to separators
        .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
        .replace(/&nbsp;/g, ' ') // Convert nbsp to spaces
        .replace(/&amp;/g, '&') // Convert HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Collapse multiple newlines
        .trim();
    } catch (error) {
      console.error('[ClinicalNoteDetail] Error converting HTML to text:', error);
      return 'Error parsing content';
    }
  };

  const clinicalData = parseHtmlTable(detailedNote.htmldata);
  const plainTextContent = htmlToPlainText(detailedNote.htmldata);

  // Show loading state while fetching detailed note
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Clinical Note</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading clinical note details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if fetch failed
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Clinical Note</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDetailedNote} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderClinicalRow = (item, index) => (
    <View key={index} style={styles.clinicalRow}>
      <View style={styles.rowNumber}>
        <Text style={styles.rowNumberText}>{index + 1}</Text>
      </View>
      
      <View style={styles.rowContent}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Diagnosis</Text>
          <Text style={styles.fieldValue}>{item.diagnosis}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Problem</Text>
          <Text style={styles.fieldValue}>{item.problem}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Intervention</Text>
          <Text style={styles.fieldValue}>{item.intervention}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Clinical Note</Text>
        <TouchableOpacity 
          onPress={handleGeneratePDF}
          style={styles.pdfButton}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.pdfButtonText}>📄 PDF</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Doctor Information Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorHeader}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorInitial}>
                {detailedNote.practitionername ? detailedNote.practitionername.charAt(0) : 'D'}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{detailedNote.practitionername || 'Unknown Doctor'}</Text>
              <Text style={styles.doctorQualification}>
                {detailedNote.practitioner_qualification || 'Medical Practitioner'}
              </Text>
            </View>
          </View>
          
          <View style={styles.visitInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Visit Date:</Text>
              <Text style={styles.infoValue}>{formatDate(detailedNote.datetime)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Note ID:</Text>
              <Text style={styles.infoValue}>#{detailedNote.id}</Text>
            </View>
          </View>
        </View>

        {/* Clinical Data */}
        <View style={styles.clinicalSection}>
          <Text style={styles.sectionTitle}>Clinical Assessment</Text>
          <Text style={styles.sectionSubtitle}>
            {clinicalData.length} clinical finding{clinicalData.length !== 1 ? 's' : ''} recorded
          </Text>
          
          {clinicalData.length > 0 ? (
            clinicalData.map((item, index) => renderClinicalRow(item, index))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>📋</Text>
              <Text style={styles.noDataText}>No structured clinical data available</Text>
              <Text style={styles.noDataSubtext}>
                Showing plain text content below
              </Text>
            </View>
          )}
        </View>

        {/* Plain Text Content - Show when no structured data or as additional info */}
        {plainTextContent && plainTextContent.length > 20 && (
          <View style={styles.clinicalSection}>
            <Text style={styles.sectionTitle}>Clinical Notes Content</Text>
            <View style={styles.plainTextContainer}>
              <Text style={styles.plainTextContent}>{plainTextContent}</Text>
            </View>
          </View>
        )}

        {/* Raw HTML Data (for debugging - remove in production) */}
        {__DEV__ && detailedNote.htmldata && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Raw HTML Data (Debug)</Text>
            <ScrollView style={styles.htmlContainer} horizontal>
              <Text style={styles.htmlText}>{detailedNote.htmldata}</Text>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  placeholder: {
    width: 50,
  },
  pdfButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  doctorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  doctorInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  doctorQualification: {
    fontSize: 14,
    color: '#8e8e93',
  },
  visitInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1c1c1e',
    fontWeight: '500',
  },
  clinicalSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 20,
  },
  clinicalRow: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f7',
  },
  rowNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rowNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  rowContent: {
    flex: 1,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: '#1c1c1e',
    lineHeight: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
  plainTextContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  plainTextContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // Debug styles (remove in production)
  debugSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  htmlContainer: {
    maxHeight: 200,
  },
  htmlText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff3b30',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginTop: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#28a745',
    borderRadius: 8,
    marginBottom: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
  },
});

export default ClinicalNoteDetailScreen;