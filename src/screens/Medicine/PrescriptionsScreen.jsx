import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Platform, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {PrescriptionDB, MedicineDB} from '../../services/MedicationDatabaseService';
import {ArrowBackIcon, MedicinesIcon, CalendarIcon, ArrowRightIcon, SearchIcon, CapsuleIcon, PlusIcon, FileTextIcon} from '../../assets/icons/Icons';

export default function PrescriptionsScreen({navigation}) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions();
    }, [])
  );

  const loadPrescriptions = async () => {
    try {
      const allPrescriptions = await PrescriptionDB.getAll();
      
      // Enrich with medicine count
      const enriched = await Promise.all(
        allPrescriptions.map(async (presc) => {
          const medicines = await MedicineDB.getByPrescriptionId(presc.id);
          return {
            ...presc,
            medicineCount: medicines.length,
          };
        })
      );

      setPrescriptions(enriched);
    } catch (error) {
      console.error('[PrescriptionsScreen] Load error:', error);
      Alert.alert('Error', 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() =>
    prescriptions.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.doctorName && p.doctorName.toLowerCase().includes(query.toLowerCase()))
    ),
  [prescriptions, query]);

  const handleCreateNew = () => {
    navigation.navigate('CreatePrescription');
  };

  const handlePrescriptionPress = (prescription) => {
    navigation.navigate('PrescriptionDetail', {prescriptionId: prescription.id});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return colors.success || colors.primary;
      case 'completed':
        return colors.textMuted;
      case 'draft':
        return colors.warning || colors.textSecondary;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading prescriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <TouchableOpacity onPress={handleCreateNew} style={styles.addBtn}>
            <PlusIcon size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <SearchIcon size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search prescriptions..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {prescriptions.length === 0 ? (
          // Empty State
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileTextIcon size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
            <Text style={styles.emptyText}>
              Create your first prescription to start tracking your medication schedule offline
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleCreateNew} activeOpacity={0.8}>
              <PlusIcon size={18} color={colors.white} />
              <Text style={styles.emptyBtnText}>Create Prescription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {filtered.length} Prescription{filtered.length !== 1 ? 's' : ''}
            </Text>

            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No prescriptions match "{query}"</Text>
              </View>
            ) : (
              filtered.map((presc, i) => (
                <TouchableOpacity
                  key={presc.id}
                  style={[styles.prescCard, presc.status === 'active' && styles.prescCardActive]}
                  onPress={() => handlePrescriptionPress(presc)}
                  activeOpacity={0.8}>
                  <View style={[styles.prescIcon, {backgroundColor: colors.primaryLight}]}>
                    <FileTextIcon size={22} color={colors.primary} />
                  </View>
                  <View style={styles.prescInfo}>
                    <Text style={styles.prescName}>{presc.name}</Text>
                    <Text style={styles.prescMeta}>
                      {presc.medicineCount} medicine{presc.medicineCount !== 1 ? 's' : ''}
                      {presc.doctorName ? ` • Dr. ${presc.doctorName}` : ''}
                    </Text>
                  </View>
                  <View style={styles.prescRight}>
                    <View style={[styles.statusBadge, {backgroundColor: `${getStatusColor(presc.status)}20`}]}>
                      <Text style={[styles.statusText, {color: getStatusColor(presc.status)}]}>
                        {getStatusLabel(presc.status)}
                      </Text>
                    </View>
                  </View>
                  <ArrowRightIcon size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity style={styles.createCard} onPress={handleCreateNew} activeOpacity={0.85}>
              <View style={styles.createIcon}>
                <PlusIcon size={24} color={colors.primary} />
              </View>
              <View style={styles.createInfo}>
                <Text style={styles.createName}>Create New Prescription</Text>
                <Text style={styles.createSub}>Add medicines and set up reminders</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.scheduleCard} onPress={() => navigation.navigate('MedicineSchedule')} activeOpacity={0.85}>
          <View style={styles.scheduleIcon}>
            <MedicinesIcon size={24} color={colors.primary} />
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleName}>Today's Medicine Schedule</Text>
            <Text style={styles.scheduleSub}>View your medicine timings for today</Text>
          </View>
          <ArrowRightIcon size={16} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base},
  back: {padding: 4},
  headerTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  addBtn: {padding: 4},
  
  loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md},
  loadingText: {fontSize: 14, color: colors.textSecondary},
  
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    marginBottom: spacing.base, ...shadows.sm,
  },
  searchInput: {flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0},
  clearBtn: {fontSize: 13, color: colors.textMuted, fontWeight: '700'},
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  empty: {alignItems: 'center', paddingVertical: spacing['3xl']},
  
  prescCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadows.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  prescCardActive: {
    borderColor: colors.primary,
  },
  prescIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prescInfo: {flex: 1},
  prescName: {fontSize: 14, fontWeight: '700', color: colors.primary},
  prescMeta: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  prescRight: {alignItems: 'flex-end'},
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    ...shadows.sm,
    marginTop: spacing.base,
    marginBottom: spacing.base,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  createIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createInfo: {flex: 1},
  createName: {fontSize: 14, fontWeight: '700', color: colors.primary},
  createSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  
  scheduleCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, gap: spacing.md},
  scheduleIcon: {width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  scheduleInfo: {flex: 1},
  scheduleName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  scheduleSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
});
