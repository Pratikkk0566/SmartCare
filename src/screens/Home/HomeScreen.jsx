import React, {useCallback} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, BackHandler, Platform, ToastAndroid} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {BellIcon, BrainIcon, MedicinesIcon, PillIcon, CalendarIcon, DocumentIcon, ClipboardIcon, FlaskIcon, WalletIcon, SunriseIcon, SunIcon, MoonIcon, ArrowRightIcon, PinIcon, CheckIcon, ClockIcon, XIcon, ChevronDownIcon, LockIcon} from '../../assets/icons/Icons';
import CalendarIllustration from '../../assets/illustrations/CalendarIllustration';
import WaterGlassIllustration from '../../assets/illustrations/WaterGlassIllustration';
import StatusChip from '../../components/common/StatusChip';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import TealWaveHeader from '../../components/common/TealWaveHeader';

const PERIOD_ICONS  = {morning: SunriseIcon, afternoon: SunIcon, night: MoonIcon};
const PERIOD_COLORS = {
  morning:   {icon: '#3B82F6', bg: '#EFF6FF'},
  afternoon: {icon: '#F59E0B', bg: '#FEF3C7'},
  night:     {icon: '#8B5CF6', bg: '#F3F0FF'},
};

const quickActions = [
  {label: 'Book Appointment', Icon: CalendarIcon, color: '#8B5CF6', bg: '#F3F0FF', nav: 'Appointments'},
  {label: 'Prescription',     Icon: PillIcon,       color: '#F59E0B', bg: '#FEF3C7', nav: 'Prescriptions'},
  {label: 'Clinical Notes',   Icon: ClipboardIcon,  color: '#3B82F6', bg: '#EFF6FF', nav: 'ClinicalNotes'},
  {label: 'Investigations',   Icon: FlaskIcon,      color: '#EF4444', bg: '#FEF2F2', nav: 'Investigations'},
];

export default function HomeScreen({navigation}) {
  const {
    userProfile,
    unreadCount,
    medicines,
    appointments,
    markMedicineAsTaken,
    engineSchedules,
    markEngineDoseTaken,
    snoozeEngineDose,
    markEngineDoseSkipped,
    refreshEngineData,
  } = useApp();
  // Appointments arrive asynchronously; show skeleton until first data lands
  const [apptReady, setApptReady] = React.useState(false);
  
  React.useEffect(() => {
    if (appointments.length > 0) setApptReady(true);
    // If no appointments exist after a short delay, stop skeleton too
    const t = setTimeout(() => setApptReady(true), 3000);
    return () => clearTimeout(t);
  }, [appointments]);

  const [expandedPeriod, setExpandedPeriod] = React.useState(null); // Track which period is expanded
  const [expandedMedIndex, setExpandedMedIndex] = React.useState(null); // Track which medicine card is expanded

  const groupedSchedule = React.useMemo(() => {
    // Main time periods
    const periods = {
      Morning: {
        period: 'Morning',
        icon: SunriseIcon,
        color: '#0284C7',
        subGroups: {
          'Morning Doses': [],
        }
      },
      Afternoon: {
        period: 'Afternoon',
        icon: SunIcon,
        color: '#D97706',
        subGroups: {
          'Afternoon Doses': [],
        }
      },
      Evening: {
        period: 'Evening',
        icon: SunIcon,
        color: '#EA580C',
        subGroups: {
          'Evening Doses': [],
        }
      },
      Night: {
        period: 'Night',
        icon: MoonIcon,
        color: '#7C3AED',
        subGroups: {
          'Night Doses': [],
        }
      },
    };

    // If engine schedules are available for today, use them!
    if (engineSchedules && engineSchedules.length > 0) {
      engineSchedules.forEach((s) => {
        let slotKey = String(s.slot || '').toUpperCase().trim();
        let mainPeriod = 'Morning';
        let subGroup = 'Morning Doses';

        if (slotKey.includes('AFTERNOON') || slotKey.includes('LUNCH') || slotKey.includes('NOON') || slotKey === 'SLOT_2') {
          mainPeriod = 'Afternoon';
          subGroup = 'Afternoon Doses';
        } else if (slotKey.includes('NIGHT') || slotKey.includes('BEDTIME') || slotKey.includes('DINNER') || slotKey === 'SLOT_3') {
          mainPeriod = 'Night';
          subGroup = 'Night Doses';
        } else if (slotKey.includes('EVENING') || slotKey.includes('SUNSET') || slotKey === 'SLOT_4') {
          mainPeriod = 'Evening';
          subGroup = 'Evening Doses';
        } else if (s.scheduledTime) {
          const hour = parseInt(s.scheduledTime.split(':')[0], 10);
          if (hour >= 12 && hour < 17) {
            mainPeriod = 'Afternoon';
            subGroup = 'Afternoon Doses';
          } else if (hour >= 17 && hour < 21) {
            mainPeriod = 'Evening';
            subGroup = 'Evening Doses';
          } else if (hour >= 21 || hour < 6) {
            mainPeriod = 'Night';
            subGroup = 'Night Doses';
          } else {
            mainPeriod = 'Morning';
            subGroup = 'Morning Doses';
          }
        }

        const isLocked = s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now() && s.status !== 'TAKEN' && s.status !== 'SKIPPED';
        const medItem = {
          id: s.id,
          time: s.scheduledTime12h || s.scheduledTime,
          medicine: s.medicineName,
          dose: s.dosage || `${s.doseQuantity} dose`,
          period: mainPeriod.toLowerCase(),
          status: isLocked ? 'locked' : (s.status?.toLowerCase() || 'upcoming'),
          timing: s.timingInstruction || 'After food',
          isEngineDose: true,
          isLocked,
          scheduledAt: s.scheduledAt,
        };

        if (!periods[mainPeriod].subGroups[subGroup]) {
          periods[mainPeriod].subGroups[subGroup] = [];
        }
        periods[mainPeriod].subGroups[subGroup].push(medItem);
      });
    } else {
      // Fallback to medicines
      medicines.forEach(med => {
        med.schedule?.forEach(s => {
          const medItem = {
            id: `${med.id}_${s.period}`,
            time: s.time,
            medicine: med.name,
            dose: s.dose,
            period: s.period,
            status: s.status,
            timing: s.timing || s.whenToTake || 'custom',
            isEngineDose: false,
          };

          const timing = (medItem.timing || '').toLowerCase();
          const time = medItem.time || '';
          const hour = time ? parseInt(time.split(':')[0], 10) : 12;
          
          let mainPeriod = 'Morning';
          let subGroup = 'Morning Doses';
          if (medItem.period === 'afternoon' || (hour >= 12 && hour < 17)) {
            mainPeriod = 'Afternoon';
            subGroup = 'Afternoon Doses';
          } else if (medItem.period === 'evening' || (hour >= 17 && hour < 21)) {
            mainPeriod = 'Evening';
            subGroup = 'Evening Doses';
          } else if (medItem.period === 'night' || hour >= 21 || hour < 6) {
            mainPeriod = 'Night';
            subGroup = 'Night Doses';
          }

          if (!periods[mainPeriod].subGroups[subGroup]) {
            periods[mainPeriod].subGroups[subGroup] = [];
          }
          periods[mainPeriod].subGroups[subGroup].push(medItem);
        });
      });
    }

    // Sort and count
    const result = [];
    Object.keys(periods).forEach(periodKey => {
      Object.keys(periods[periodKey].subGroups).forEach(subGroupKey => {
        periods[periodKey].subGroups[subGroupKey].sort((a, b) => 
          (a.time || '').localeCompare(b.time || '')
        );
      });
      
      const subGroups = periods[periodKey].subGroups;
      Object.keys(subGroups).forEach(key => {
        if (subGroups[key].length === 0) {
          delete subGroups[key];
        }
      });

      periods[periodKey].totalCount = Object.values(periods[periodKey].subGroups)
        .reduce((sum, arr) => sum + arr.length, 0);

      if (periods[periodKey].totalCount > 0) {
        result.push(periods[periodKey]);
      }
    });

    return result;
  }, [medicines, engineSchedules]);

  useFocusEffect(
    useCallback(() => {
      refreshEngineData().catch((e) => console.log('[HomeScreen] refresh error:', e.message));

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
        setTimeout(() => { backPressedOnce = false; }, 2000);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [refreshEngineData]),
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        bounces={true}>
        
        {/* Teal Wave Background with Header Content */}
        <TealWaveHeader>
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userProfile.firstName?.[0]}{userProfile.lastName?.[0]}</Text>
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.headerCenter}>
                <Text style={styles.greeting}>Hi, {userProfile.firstName?.toUpperCase()}</Text>
                <Text style={styles.greetingSubtitle}>Let's take care of your health today.</Text>
              </View>
              <TouchableOpacity style={styles.bellWrap} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
                <BellIcon size={24} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TealWaveHeader>

        {/* Quick Actions — single 4-column row with premium card styling */}
        <View style={styles.card}>
          <View style={styles.quickRow}>
            {quickActions.map(({label, Icon, color, bg, nav}) => (
              <TouchableOpacity
                key={label}
                style={[styles.quickCard, {backgroundColor: bg}]}
                onPress={() => (nav ? navigation.navigate(nav) : Alert.alert(label, 'Coming soon!'))}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={label}>
                <View style={[styles.quickIconWrap, {
                  backgroundColor: '#fff',
                  borderColor: color + '30',
                  shadowColor: color,
                }]}>
                  <Icon size={28} color={color} />
                </View>
                <Text style={styles.quickLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Medicine Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MedicinesIcon size={29} color="#14A098" />
            <Text style={styles.sectionTitle}>Today's Medicines</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MedicineSchedule')}>
              <Text style={styles.viewAll}>View all {'>'}</Text>
            </TouchableOpacity>
          </View>

          {groupedSchedule.length === 0 ? (
            <View style={styles.emptyMeds}>
              <PillIcon size={40} color={colors.textMuted} />
              <Text style={styles.emptyMedsText}>No medicines scheduled for today</Text>
            </View>
          ) : (
            groupedSchedule.map((periodData, periodIndex) => {
              const isPeriodExpanded = expandedPeriod === periodIndex;
              const PeriodIcon = periodData.icon;
              
              return (
                <View key={periodData.period} style={styles.periodGroup}>
                  {/* Period Header - Click to expand/collapse */}
                  <TouchableOpacity
                    style={styles.periodHeader}
                    onPress={() => setExpandedPeriod(isPeriodExpanded ? null : periodIndex)}
                    activeOpacity={0.8}>
                    <View style={[styles.periodIconSmall, {backgroundColor: periodData.color + '20'}]}>
                      <PeriodIcon size={20} color={periodData.color} />
                    </View>
                    <Text style={styles.periodTitle}>{periodData.period}</Text>
                    <View style={styles.periodBadge}>
                      <Text style={styles.periodBadgeText}>{periodData.totalCount}</Text>
                    </View>
                    <ChevronDownIcon 
                      size={18} 
                      color={colors.textMuted} 
                      style={{
                        transform: [{ rotate: isPeriodExpanded ? '180deg' : '0deg' }]
                      }}
                    />
                  </TouchableOpacity>

                  {/* Expanded Sub-groups */}
                  {isPeriodExpanded && (
                    <View style={styles.subGroupsContainer}>
                      {Object.entries(periodData.subGroups).map(([subGroupName, meds]) => (
                        <View key={subGroupName} style={styles.subGroup}>
                          {/* Sub-group Label */}
                          <View style={styles.subGroupLabel}>
                            <Text style={styles.subGroupText}>{subGroupName}</Text>
                            <Text style={styles.subGroupCount}>({meds.length})</Text>
                          </View>

                          {/* Medicines in this sub-group */}
                          {meds.map((item, medIdx) => {
                            const globalIndex = `${periodIndex}-${subGroupName}-${medIdx}`;
                            const isMedExpanded = expandedMedIndex === globalIndex;
                            
                            return (
                              <View key={globalIndex}>
                                <TouchableOpacity
                                  style={[styles.medRowCompact, isMedExpanded && styles.medRowExpanded]}
                                  onPress={() => setExpandedMedIndex(isMedExpanded ? null : globalIndex)}
                                  activeOpacity={0.8}>
                                  <View style={styles.medInfoCompact}>
                                    <Text style={styles.medNameCompact}>
                                      <Text style={styles.medNameHighlight}>{item.medicine}</Text>
                                      {' · '}{item.dose}
                                    </Text>
                                    {item.time && <Text style={styles.medTimeSmall}>⏰ {item.time}</Text>}
                                  </View>
                                  <StatusChip status={item.status} size="xs" />
                                  <ChevronDownIcon 
                                    size={16} 
                                    color={colors.textMuted} 
                                    style={{
                                      transform: [{ rotate: isMedExpanded ? '180deg' : '0deg' }]
                                    }}
                                  />
                                </TouchableOpacity>

                                {/* Expanded Actions */}
                                {isMedExpanded && (
                                  <View style={styles.medActionsCompact}>
                                    {item.isLocked ? (
                                      <TouchableOpacity
                                        style={[styles.medActionBtn, {backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0'}]}
                                        onPress={() => {
                                          Alert.alert(
                                            '🔒 Dose Locked',
                                            `${item.medicine} is scheduled for ${item.time}.\n\nYou can record this dose once the scheduled time arrives.`,
                                            [{text: 'OK'}]
                                          );
                                        }}
                                        activeOpacity={0.8}>
                                        <LockIcon size={16} color="#64748B" />
                                        <Text style={[styles.medActionTextPrimary, {color: '#64748B'}]}>
                                          Available at {item.time}
                                        </Text>
                                      </TouchableOpacity>
                                    ) : item.status === 'taken' ? (
                                      <View style={{gap: 8}}>
                                        <View style={[styles.medActionBtn, {backgroundColor: '#DCFCE7', borderColor: '#BBF7D0', borderWidth: 1}]}>
                                          <CheckIcon size={18} color="#16A34A" />
                                          <Text style={[styles.medActionTextPrimary, {color: '#16A34A'}]}>✓ Dose Recorded as Taken</Text>
                                        </View>
                                        <View style={styles.medActionRow}>
                                          <View style={[styles.medActionBtnSmall, styles.medActionSecondary, {flex: 1, opacity: 0.35}]}>
                                            <ClockIcon size={16} color="#94A3B8" />
                                            <Text style={[styles.medActionTextSmall, {color: '#94A3B8'}]}>Snooze</Text>
                                          </View>
                                          <View style={[styles.medActionBtnSmall, styles.medActionSecondary, {flex: 1, opacity: 0.35}]}>
                                            <XIcon size={16} color="#94A3B8" />
                                            <Text style={[styles.medActionTextSmall, {color: '#94A3B8'}]}>Skip</Text>
                                          </View>
                                        </View>
                                      </View>
                                    ) : item.status === 'skipped' ? (
                                      <View style={{gap: 8}}>
                                        <View style={[styles.medActionBtn, {backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderWidth: 1}]}>
                                          <XIcon size={18} color="#64748B" />
                                          <Text style={[styles.medActionTextPrimary, {color: '#64748B'}]}>✕ Dose Skipped</Text>
                                        </View>
                                        <View style={styles.medActionRow}>
                                          <View style={[styles.medActionBtnSmall, styles.medActionSecondary, {flex: 1, opacity: 0.35}]}>
                                            <ClockIcon size={16} color="#94A3B8" />
                                            <Text style={[styles.medActionTextSmall, {color: '#94A3B8'}]}>Snooze</Text>
                                          </View>
                                          <View style={[styles.medActionBtnSmall, styles.medActionSecondary, {flex: 1, opacity: 0.35}]}>
                                            <XIcon size={16} color="#94A3B8" />
                                            <Text style={[styles.medActionTextSmall, {color: '#94A3B8'}]}>Skip</Text>
                                          </View>
                                        </View>
                                      </View>
                                    ) : (
                                      <>
                                        <TouchableOpacity
                                          style={[styles.medActionBtn, styles.medActionPrimary]}
                                          onPress={async () => {
                                            try {
                                              if (item.isEngineDose) {
                                                await markEngineDoseTaken(item.id);
                                              } else {
                                                Alert.alert('Taken', `${item.medicine} marked as taken`);
                                              }
                                            } catch (e) {
                                              console.log('[HomeScreen] take dose error:', e.message);
                                            }
                                            setExpandedMedIndex(null);
                                          }}
                                          activeOpacity={0.8}>
                                          <CheckIcon size={18} color="#fff" />
                                          <Text style={styles.medActionTextPrimary}>Mark as Taken</Text>
                                        </TouchableOpacity>

                                        <View style={styles.medActionRow}>
                                          <TouchableOpacity
                                            style={[styles.medActionBtnSmall, styles.medActionSecondary, {flex: 1}]}
                                            onPress={async () => {
                                              try {
                                                if (item.isEngineDose) {
                                                  await snoozeEngineDose(item.id, 15);
                                                } else {
                                                  Alert.alert('Snoozed', `${item.medicine} reminder snoozed for 15 mins`);
                                                }
                                              } catch (e) {
                                                console.log('[HomeScreen] snooze error:', e.message);
                                              }
                                              setExpandedMedIndex(null);
                                            }}
                                            activeOpacity={0.8}>
                                            <ClockIcon size={16} color={colors.primary} />
                                            <Text style={[styles.medActionTextSmall, {color: colors.primary}]}>Snooze (15m)</Text>
                                          </TouchableOpacity>

                                          <TouchableOpacity
                                            style={[styles.medActionBtnSmall, styles.medActionSecondary, {flex: 1}]}
                                            onPress={async () => {
                                              try {
                                                if (item.isEngineDose) {
                                                  await markEngineDoseSkipped(item.id, 'Skipped from dashboard');
                                                } else {
                                                  Alert.alert('Skipped', `${item.medicine} skipped`);
                                                }
                                              } catch (e) {
                                                console.log('[HomeScreen] skip error:', e.message);
                                              }
                                              setExpandedMedIndex(null);
                                            }}
                                            activeOpacity={0.8}>
                                            <XIcon size={16} color={colors.error} />
                                            <Text style={[styles.medActionTextSmall, {color: colors.error}]}>Skip</Text>
                                          </TouchableOpacity>
                                        </View>
                                      </>
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Upcoming Appointment */}
        {!apptReady ? (
          <View style={[styles.apptCard, {gap: 12}]}>
            <View style={{flex: 1, gap: 10}}>
              <SkeletonLoader width="40%" height={11} radius={5} />
              <SkeletonLoader width="70%" height={18} radius={6} />
              <SkeletonLoader width="55%" height={13} radius={5} />
              <SkeletonLoader width="60%" height={13} radius={5} />
            </View>
            <SkeletonLoader width={70} height={70} radius={12} />
          </View>
        ) : (
        <TouchableOpacity style={styles.apptCard} onPress={() => navigation.navigate('Appointments')} activeOpacity={0.85}>
          <View style={styles.apptLeft}>
            <Text style={styles.apptLabel}>Upcoming Appointment</Text>
            {appointments[0] ? (
              <>
                <Text style={styles.apptTitle}>{appointments[0].type}</Text>
                <View style={styles.apptRow}>
                  <CalendarIcon size={14} color={colors.textSecondary} />
                  <Text style={styles.apptMeta}>{appointments[0].date} • {appointments[0].time}</Text>
                </View>
                <View style={styles.apptRow}>
                  <PinIcon size={14} color={colors.textSecondary} />
                  <Text style={styles.apptMeta}>{appointments[0].location}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.apptTitle}>No upcoming appointments</Text>
                <Text style={styles.apptMeta}>Tap to book a consultation</Text>
              </>
            )}
          </View>
          <View style={styles.apptRight}>
            <CalendarIllustration width={70} height={70} />
            <ArrowRightIcon size={16} color="#14A098" />
          </View>
        </TouchableOpacity>
        )}

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

      {/* SmartCare AI floating assistant button */}
      <TouchableOpacity
        style={styles.aiFab}
        onPress={() => navigation.navigate('AIAssistant')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open SmartCare AI Assistant"
        accessibilityHint="Ask SmartCare AI a health question">
        <View style={styles.aiFabCircle}>
          <BrainIcon size={27} color="#FFFFFF" />
        </View>
        <Text style={styles.aiFabLabel}>Ask AI</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  scroll: {flexGrow: 1, paddingBottom: 32},

  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.md
  },
  
  avatar: {
    width: 58, 
    height: 58, 
    borderRadius: 29, 
    backgroundColor: '#FFFFFF', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 20, 
    fontWeight: '800', 
    color: '#14A098'
  },
  onlineDot: {
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#22C55E', 
    borderWidth: 2, 
    borderColor: '#FFFFFF'
  },
  headerCenter: {flex: 1},
  greeting: {
    fontSize: 23, 
    fontWeight: '700', 
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  greetingSubtitle: {
    fontSize: 13, 
    color: 'rgba(255,255,255,0.9)', 
    marginTop: 2
  },
  bellWrap: {
    position: 'relative', 
    padding: 6,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', 
    top: 2, 
    right: 2, 
    backgroundColor: '#EF4444', 
    borderRadius: 9999, 
    minWidth: 18, 
    height: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 4, 
    borderWidth: 2, 
    borderColor: '#FFFFFF'
  },
  bellBadgeText: {color: '#fff', fontSize: 10, fontWeight: '700'},

  card: {marginBottom: spacing.base, marginHorizontal: spacing.base},

  // Premium 4-column quick action grid — matches hero-banner design language
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  quickIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 17,
    letterSpacing: 0.2,
    flexWrap: 'wrap',
  },

  section:       {marginBottom: spacing.base, marginHorizontal: spacing.base},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md},
  sectionTitle:  {flex: 1, fontSize: 20, fontWeight: '700', color: colors.textPrimary},
  viewAll:       {fontSize: 13, color: '#14A098', fontWeight: '600'},

  emptyMeds: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  emptyMedsText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  // Period group (Morning, Afternoon, Evening, Night)
  periodGroup: {
    marginBottom: spacing.md,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  periodIconSmall: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  periodBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 26,
    alignItems: 'center',
  },
  periodBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },

  // Sub-groups container
  subGroupsContainer: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    paddingTop: spacing.md,
    ...shadows.sm,
  },
  subGroup: {
    marginBottom: spacing.md,
  },
  subGroupLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  subGroupText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  subGroupCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Compact medicine row
  medRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  medRowExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  medInfoCompact: {
    flex: 1,
  },
  medNameCompact: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  medNameHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medTimeSmall: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Compact actions
  medActionsCompact: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    padding: spacing.sm,
    paddingTop: 0,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  medActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  medActionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 4,
  },
  medActionPrimary: {
    backgroundColor: colors.primary,
  },
  medActionSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  medActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  medActionTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  medActionTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  apptCard:  {backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.base, ...shadows.md, marginBottom: spacing.base, marginHorizontal: spacing.base, flexDirection: 'row', alignItems: 'center'},
  apptLeft:  {flex: 1},
  apptLabel: {fontSize: 11, fontWeight: '700', color: '#14A098', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4},
  apptTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm},
  apptRow:   {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  apptMeta:  {fontSize: 13, color: colors.textSecondary},
  apptRight: {alignItems: 'center', gap: spacing.sm},

  tipCard:  {backgroundColor: '#E0F7F5', borderRadius: radius.md, padding: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.base},
  tipLeft:  {flex: 1},
  tipLabel: {fontSize: 13, fontWeight: '700', color: '#14A098', marginBottom: 4},
  tipText:  {fontSize: 13, color: '#0F7C7C', lineHeight: 18},
  tipRight: {alignItems: 'center', gap: spacing.xs},
  aiFab: {
    position: 'absolute',
    right: 18,
    bottom: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  aiFabCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14A098',
    shadowColor: '#14A098',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 7,
  },
  aiFabLabel: {
    marginTop: 4,
    color: '#14A098',
    fontSize: 10,
    fontWeight: '700',
  },
});
