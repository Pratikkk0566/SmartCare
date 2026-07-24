import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, PillIcon, CalendarIcon, ArrowRightIcon} from '../../assets/icons/Icons';

export default function PrescriptionsScreen({navigation}) {
  const {medicines} = useApp();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescriptions</Text>
        </View>

        <Text style={styles.sectionTitle}>Your Medicines</Text>

        {medicines.map((med, i) => (
          <TouchableOpacity
            key={med.id}
            style={[styles.medCard, i === 0 && styles.medCardHighlighted]}
            onPress={() => navigation.navigate('AboutMedicine', {medicine: med})}
            activeOpacity={0.8}>
            <View style={[styles.medIcon, {backgroundColor: med.bgColor}]}>
              <Text style={styles.medEmoji}>💊</Text>
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
        ))}

        <TouchableOpacity style={styles.scheduleCard} onPress={() => navigation.navigate('MedicineSchedule')} activeOpacity={0.85}>
          <View style={styles.scheduleIcon}>
            <PillIcon size={24} color={colors.primary} />
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
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl},
  back: {padding: 4},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  medCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md, borderWidth: 1.5, borderColor: 'transparent'},
  medCardHighlighted: {borderColor: colors.primary},
  medIcon: {width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  medEmoji: {fontSize: 22},
  medInfo: {flex: 1},
  medName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
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
