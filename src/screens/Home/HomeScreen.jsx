import React, {useCallback} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, BackHandler, Platform,ToastAndroid} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {todaySchedule, appointments} from '../../data/mockData';
import {BellIcon, PillIcon, CalendarIcon, DocumentIcon, ClipboardIcon, FlaskIcon, SunriseIcon, SunIcon, MoonIcon, ArrowRightIcon, PinIcon, InvoiceIcon} from '../../assets/icons/Icons';
import CalendarIllustration from '../../assets/illustrations/CalendarIllustration';
import WaterGlassIllustration from '../../assets/illustrations/WaterGlassIllustration';
import StatusChip from '../../components/common/StatusChip';

const PERIOD_ICONS = {morning: SunriseIcon, afternoon: SunIcon, night: MoonIcon};
const PERIOD_COLORS = {morning: {icon: '#3B82F6', bg: '#DBEAFE'}, afternoon: {icon: '#F59E0B', bg: '#FEF3C7'}, night: {icon: '#6C63FF', bg: '#EEE9FF'}};

const quickActions = [
  {label: 'Book Appointment', Icon: CalendarIcon, color: '#6C63FF', bg: '#F0EEFF', nav: 'Appointments'},
  {label: 'Health Records',   Icon: DocumentIcon,  color: '#22C55E', bg: '#F0FDF4', nav: null},
  {label: 'Prescription',     Icon: PillIcon,       color: '#F59E0B', bg: '#FFFBEB', nav: 'Prescriptions'},
  {label: 'Clinical Notes',   Icon: ClipboardIcon,  color: '#3B82F6', bg: '#EFF6FF', nav: null},
  {label: 'Investigations',   Icon: FlaskIcon,      color: '#EF4444', bg: '#FFF1F1', nav: 'Investigations'},
  {label: 'Payments',         Icon: InvoiceIcon,    color: '#8B5CF6', bg: '#F5F3FF', nav: 'Invoices'},
];

export default function HomeScreen({navigation}) {
  const {userProfile, unreadCount} = useApp();
   useFocusEffect(
    useCallback(() => {
      let backPressedOnce = false;
      const onBackPress = () => {
        if (backPressedOnce) {
          BackHandler.exitApp();
          return true;
        }
        backPressedOnce = true;
        if (Platform.OS === 'android') {
  ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
}
        setTimeout(() => {
          backPressedOnce = false;
        }, 2000);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userProfile.firstName?.[0]}{userProfile.lastName?.[0]}</Text>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>Hi, {userProfile.firstName} 👋</Text>
            <Text style={styles.greetingSubtitle}>Let's take care of your health today.</Text>
          </View>
          <TouchableOpacity
            style={styles.bellWrap}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}>
            <BellIcon size={39} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

      
        <View style={styles.card}>
          {/* Quick Actions */}
<View style={styles.quickGrid}>
 {quickActions.map(({label, Icon, color, nav, bg}) => (
  <TouchableOpacity
    key={label}
    style={[styles.quickCard, {backgroundColor: bg}]}
    onPress={() => (nav ? navigation.navigate(nav) : Alert.alert(label, 'Coming soon!'))}
    activeOpacity={0.85}>
    <View style={[styles.quickIconWrap, {backgroundColor: '#fff', borderColor: color + '40'}]}>
      <Icon size={26} color={color} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
))}
</View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PillIcon size={29} color={colors.primary} />
            <Text style={styles.sectionTitle}>Today's Medicine Schedule</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MedicineSchedule')}>
              <Text style={styles.viewAll}>View all {'>'}</Text>
            </TouchableOpacity>
          </View>
          {todaySchedule.map((item, i) => {
            const PeriodIcon = PERIOD_ICONS[item.period];
            const periodColor = PERIOD_COLORS[item.period];
            return (
              <TouchableOpacity
                key={i}
                style={styles.medRow}
                onPress={() => navigation.navigate('MedicineSchedule')}
                activeOpacity={0.8}>
                <View style={[styles.periodIcon, {backgroundColor: periodColor.bg}]}>
                  <PeriodIcon size={25} color={periodColor.icon} />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medTime}>{item.time}</Text>
                  <Text style={styles.medName}>{item.medicine} · {item.dose}</Text>
                </View>
                <StatusChip status={item.status} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Upcoming Appointment */}
        <TouchableOpacity style={styles.apptCard} onPress={() => navigation.navigate('Appointments')} activeOpacity={0.85}>
          <View style={styles.apptLeft}>
            <Text style={styles.apptLabel}>Upcoming Appointment</Text>
            <Text style={styles.apptTitle}>{appointments[0].type}</Text>
            <View style={styles.apptRow}>
              <CalendarIcon size={14} color={colors.textSecondary} />
              <Text style={styles.apptMeta}>{appointments[0].date} • {appointments[0].time}</Text>
            </View>
            <View style={styles.apptRow}>
              <PinIcon size={14} color={colors.textSecondary} />
              <Text style={styles.apptMeta}>{appointments[0].location}</Text>
            </View>
          </View>
          <View style={styles.apptRight}>
            <CalendarIllustration width={70} height={70} />
            <ArrowRightIcon size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Daily Tip */}
<View style={styles.tipCard}>
  <View style={styles.tipLeft}>
    <Text style={styles.tipLabel}>Daily Tip</Text>
    <Text style={styles.tipText}>Drink plenty of water and take short walks to stay active and healthy.</Text>
  </View>
  <View style={styles.tipRight}>
    <WaterGlassIllustration width={60} height={60} />
  </View>
</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: spacing.md},
  avatar: {width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: 20, fontWeight: '800', color: colors.primary},
  onlineDot: {position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface},
  headerCenter: {flex: 1},
  greeting: {fontSize: 23, fontWeight: '700', color: colors.textPrimary},
  greetingSubtitle: {fontSize: 14, color: colors.textSecondary, marginTop: 2},
  bellWrap: {position: 'relative', padding: 6},
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 9999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  bellBadgeText: {color: '#fff', fontSize: 10, fontWeight: '700'},
quickGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: spacing.sm,
  marginBottom: spacing.base,
},
quickCard: {
  width: '48.5%',
  borderRadius: 16,
  padding: spacing.base,
  gap: spacing.sm,
  alignItems: 'center',      // ← centers icon + text
  ...shadows.sm,
},
quickIconWrap: {
  width: 52,
  height: 52,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,          // ← metallic border
  shadowColor: '#000',       // ← icon shadow for depth
  shadowOffset: {width: 0, height: 2},
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 3,
},
quickLabel: {
  fontSize: 12,
  fontWeight: '700',
  color: colors.textPrimary,   // ← dark, readable
  textAlign: 'center',
  lineHeight: 17,
},
  section: {marginBottom: spacing.base},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md},
  sectionTitle: {flex: 1, fontSize: 20, fontWeight: '700', color: colors.textPrimary},
  viewAll: {fontSize: 13, color: colors.primary, fontWeight: '600'},
  medRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm,
    gap: spacing.md, ...shadows.sm,
  },
  periodIcon: {width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  medInfo: {flex: 1},
  medTime: {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  medName: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  apptCard: {
    backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.base,
    ...shadows.md, marginBottom: spacing.base, flexDirection: 'row', alignItems: 'center',
  },
  apptLeft: {flex: 1},
  apptLabel: {fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4},
  apptTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  apptRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  apptMeta: {fontSize: 13, color: colors.textSecondary},
  apptRight: {alignItems: 'center', gap: spacing.sm},
  tipCard: {
    backgroundColor: colors.successLight, borderRadius: radius.md, padding: spacing.base,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  tipLeft: {flex: 1},
  tipLabel: {fontSize: 13, fontWeight: '700', color: colors.success, marginBottom: 4},
  tipText: {fontSize: 13, color: '#16A34A', lineHeight: 18},
  tipRight: {alignItems: 'center', gap: spacing.xs},
});
