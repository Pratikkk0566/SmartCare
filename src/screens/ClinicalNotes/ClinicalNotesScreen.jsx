import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClinicalNotesApi } from '../../API/Api';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { ClipboardIcon, ArrowLeftIcon } from '../../assets/icons/Icons';

const ClinicalNotesScreen = ({ navigation }) => {
  const { userProfile } = useApp();
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClinicalNotes();
  }, []);

  const fetchClinicalNotes = async () => {
    try {
      setLoading(true);

      // Prefer patientId from profile; fall back to AsyncStorage
      const patientId =
        userProfile?.patientId ||
        userProfile?.clientId  ||
        (await AsyncStorage.getItem('patientId'));

      if (!patientId) {
        console.warn('[ClinicalNotes] No patientId found — skipping fetch');
        setLoading(false);
        return;
      }

      console.log('[ClinicalNotes] Fetching for patientId:', patientId);
      const response = await ClinicalNotesApi.getAll(patientId);

      if (response.success) {
        // API may return array directly or wrap it in an object
        const raw = response.data;
        let list = [];
        
        if (Array.isArray(raw)) {
          list = raw;
        } else if (raw && typeof raw === 'object') {
          list = raw.data || raw.list || raw.records || raw.clinicalNotes || [];
          if (!Array.isArray(list)) list = [];
        }
        
        // Filter out any invalid items
        const validList = list.filter(item => {
          if (!item || typeof item !== 'object') {
            console.warn('[ClinicalNotes] Invalid item filtered out:', item);
            return false;
          }
          return true;
        });
        
        console.log('[ClinicalNotes] Loaded', validList.length, 'valid notes');
        setClinicalNotes(validList);
      } else {
        console.error('[ClinicalNotes] API error:', response.error);
        Alert.alert('Error', response.error || 'Failed to fetch clinical notes');
      }
    } catch (error) {
      console.error('[ClinicalNotes] Error:', error);
      Alert.alert('Error', 'Something went wrong while loading clinical notes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClinicalNotes();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Parse DD-MM-YYYY HH:MM:SS format
      const [datePart, timePart] = dateString.split(' ');
      const [day, month, year] = datePart.split('-');
      const date = new Date(`20${year}`, month - 1, day);
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const extractDiagnosis = (htmlData) => {
    if (!htmlData) return 'No diagnosis available';
    
    try {
      // Try to extract structured data from table
      const diagnosisMatch = htmlData.match(/<td[^>]*>([^<]+)<\/td>/);
      if (diagnosisMatch && diagnosisMatch[1]) {
        const diagnosis = diagnosisMatch[1].trim();
        return diagnosis.length > 80 ? diagnosis.substring(0, 80) + '...' : diagnosis;
      }
      
      // Fallback: Try to extract any meaningful text from HTML
      const textContent = htmlData
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
      
      if (textContent && textContent.length > 10) {
        return textContent.length > 80 ? textContent.substring(0, 80) + '...' : textContent;
      }
    } catch (error) {
      console.log('[ClinicalNotes] Error extracting diagnosis:', error);
    }
    
    return 'Clinical data available';
  };

  const renderClinicalNote = ({ item }) => {
    // Safety check for valid item
    if (!item || !item.id) {
      console.warn('[ClinicalNotes] Invalid item:', item);
      return null;
    }
    
    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() => {
          try {
            navigation.navigate('ClinicalNoteDetail', { note: item });
          } catch (navError) {
            console.error('[ClinicalNotes] Navigation error:', navError);
            Alert.alert('Error', 'Could not open clinical note details');
          }
        }}
        activeOpacity={0.8}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.doctorName}>{item.practitionername || 'Unknown Doctor'}</Text>
          <Text style={styles.date}>{formatDate(item.datetime)}</Text>
        </View>
        
        <View style={styles.noteContent}>
          <Text style={styles.diagnosis} numberOfLines={2}>
            {extractDiagnosis(item.htmldata)}
          </Text>
          
          <View style={styles.noteFooter}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Clinical Note</Text>
            </View>
            <Text style={styles.viewMore}>View Details →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeftIcon size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Clinical Notes</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading clinical notes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeftIcon size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Clinical Notes</Text>
        <View style={styles.placeholder} />
      </View>
      
      <FlatList
        data={clinicalNotes}
        renderItem={renderClinicalNote}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ClipboardIcon size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No clinical notes found</Text>
            <Text style={styles.emptySubtext}>Your medical records will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContainer: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  noteContent: {
    flex: 1,
  },
  diagnosis: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  viewMore: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ClinicalNotesScreen;