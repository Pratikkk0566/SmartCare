import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, MedicinesIcon, CalendarIcon, ArrowRightIcon, SearchIcon, CapsuleIcon} from '../../assets/icons/Icons';

export default function PrescriptionsScreen({navigation}) {
  const {medicines} = useApp();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() =>
    medicines.filter(m =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.category.toLowerCase().includes(query.toLowerCase())
    ),
  [medicines, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescriptions</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <SearchIcon size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
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

        <Text style={styles.sectionTitle}>
          {filtered.length} Medicine{filtered.length !== 1 ? 's' : ''}
        </Text>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No medicines match "{query}"</Text>
          </View>
        ) : (
          filtered.map((med, i) => (
            <TouchableOpacity
              key={med.id}
              style={[styles.medCard, i === 0 && styles.medCardHighlighted]}
              onPress={() => navigation.navigate('AboutMedicine', {medicine: med})}
              activeOpacity={0.8}>
              <View style={[styles.medIcon, {backgroundColor: med.bgColor}]}>
                <CapsuleIcon size={22} color={colors.primary} />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medCat}>{med.category}</Text>
              </View>
              <View style={styles.medRight}>
                <Text style={styles.medType}>{med.type}</Text>
                <Text style={styles.medQty}>{med.quantity} {med.type}s</Text>
              </View>
              <ArrowRightIcon size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
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
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    marginBottom: spacing.base, ...shadows.sm,
  },
  searchInput: {flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0},
  clearBtn: {fontSize: 13, color: colors.textMuted, fontWeight: '700'},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  empty: {alignItems: 'center', paddingVertical: spacing['3xl']},
  emptyText: {fontSize: 14, color: colors.textMuted},
  medCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md, borderWidth: 1.5, borderColor: 'transparent'},
  medCardHighlighted: {borderColor: colors.primary},
  medIcon: {width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  medEmoji: {fontSize: 22},
  medInfo: {flex: 1},
  medName: {fontSize: 14, fontWeight: '700', color: colors.primary},
  medCat: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  medRight: {alignItems: 'flex-end'},
  medType: {fontSize: 12, color: colors.textSecondary},
  medQty: {fontSize: 12, fontWeight: '600', color: colors.textPrimary, marginTop: 2},
  scheduleCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginTop: spacing.base, gap: spacing.md},
  scheduleIcon: {width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  scheduleInfo: {flex: 1},
  scheduleName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  scheduleSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
});
