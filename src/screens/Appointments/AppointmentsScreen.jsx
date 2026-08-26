import React, {useState, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {AppointmentApi, PractitionerApi} from '../../API/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ArrowBackIcon, SearchIcon, CalendarIcon, ClockIcon, PinIcon, StethoscopeIcon, VideoIcon, DocumentIcon, HeartIcon, ToothIcon, SkinCareIcon, BabyIcon, BoneIcon, BrainIcon, EarIcon, ArrowRightIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

// Local specialties — no API endpoint exists for this list
const SPEC_ICON_MAP = {
  StethoscopeIcon, HeartIcon, ToothIcon, SkinCareIcon, BabyIcon, BoneIcon, BrainIcon, EarIcon,
};

const specialties = [
  {id: 's1', name: 'General Physician', iconKey: 'StethoscopeIcon', color: '#6C63FF', bgColor: '#EEE9FF'},
  {id: 's2', name: 'Cardiologist',      iconKey: 'HeartIcon',       color: '#EF4444', bgColor: '#FEE2E2'},
  {id: 's3', name: 'Dentist',           iconKey: 'ToothIcon',       color: '#3B82F6', bgColor: '#DBEAFE'},
  {id: 's4', name: 'Dermatologist',     iconKey: 'SkinCareIcon',    color: '#22C55E', bgColor: '#DCFCE7'},
  {id: 's5', name: 'Pediatrician',      iconKey: 'BabyIcon',        color: '#F59E0B', bgColor: '#FEF3C7'},
  {id: 's6', name: 'Orthopedic',        iconKey: 'BoneIcon',        color: '#8B5CF6', bgColor: '#F5F3FF'},
  {id: 's7', name: 'Neurologist',       iconKey: 'BrainIcon',       color: '#EC4899', bgColor: '#FCE7F3'},
  {id: 's8', name: 'ENT Specialist',    iconKey: 'EarIcon',         color: '#14B8A6', bgColor: '#CCFBF1'},
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getLocalDateYYYYMMDD(d = new Date()) {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toISODateKey(value = '') {
  if (!value) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  // e.g. "August 25, 2026"
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return getLocalDateYYYYMMDD(parsed);
  return '';
}

export default function AppointmentsScreen({navigation}) {
  const {appointments: cachedAppointments, appointmentHistory: cachedHistory, appReady} = useApp();
  const [activeTab, setActiveTab] = useState('Today\'s');
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [appointmentHistory, setAppointmentHistory] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Auto-fetch on screen focus — cache first, then always refresh from API
  useFocusEffect(
    useCallback(() => {
      console.log('[AppointmentsScreen] Screen focused');
      loadAppointments();
      fetchPractitioners();
      fetchAppointments();
    }, [])
  );

  const loadAppointments = () => {
    console.log('[AppointmentsScreen] Loading appointments, cached:', cachedAppointments.length);
    if (cachedAppointments.length > 0 || cachedHistory.length > 0) {
      setAppointments(cachedAppointments);
      setAppointmentHistory(cachedHistory);
      filterTodayAppointments(cachedAppointments, cachedHistory);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  const filterTodayAppointments = (upcomingList, historyList = []) => {
    const today = getLocalDateYYYYMMDD();
    console.log('[AppointmentsScreen] Today (local):', today);
    // Today = ALL appointments whose LOCAL date is today, regardless of past/future time
    const merged = [...upcomingList, ...historyList];
    const todayAppts = merged.filter(a => {
      const apptDate = toISODateKey(a.date);
      return apptDate === today;
    });
    console.log('[AppointmentsScreen] Today appointments:', todayAppts.length);
    setTodayAppointments(todayAppts);
  };

  const fetchPractitioners = async () => {
    setLoadingDoctors(true);
    try {
      const result = await PractitionerApi.getList("1", 0, 0);
      console.log('[AppointmentsScreen] Practitioners API result:', result.success);
      
      if (result.success) {
        const list = result.data?.practitioners || result.data || [];
        console.log('[AppointmentsScreen] Raw practitioners:', list.length);
        
        if (Array.isArray(list) && list.length > 0) {
          console.log('[AppointmentsScreen] First practitioner:', JSON.stringify(list[0], null, 2));
        }
        
        const normalized = Array.isArray(list) ? list.map(p => {
          const getId = () => {
            const candidates = [
              p.practitionerId, p.diaryuserid, p.diaryUserId, p.userId, p.user_id,
              p.id, p.doctorId, p.doctor_id, p.practionerId,
            ];
            for (const c of candidates) {
              if (c !== undefined && c !== null && String(c).trim() !== '') return c;
            }
            return null;
          };

          const getName = () => {
            const candidates = [
              p.practitionerName, p.diaryuser, p.diaryUser, p.name, p.doctorName, p.userName,
              p.fullName, p.doctor_name, p.practitioner_name,
            ];
            for (const c of candidates) {
              if (c && String(c).trim() !== '') return c;
            }
            return 'Unknown Doctor';
          };

          const practitionerId = getId();
          const practitionerName = getName();

          return {
            practitionerId,
            id: practitionerId,
            name: practitionerName,
            specialty: p.specialization || p.specialty || p.department || 'General Medicine',
            qualifications: p.qualification || p.qualifications || p.degree || 'MBBS',
            rating: p.rating || 4.5,
            reviewCount: p.reviewCount || p.review_count || 0,
            consultationFee: p.consultationFee || p.charge || p.fee || 500,
            experience: p.experience || '10+ years',
            clinic: p.clinic || p.hospital || p.location || 'Main Clinic',
            avatar: p.avatar || p.photo || null,
            _raw: p,
          };
        }).filter(p => p.practitionerId).slice(0, 5) : []; // Show top 5 doctors
        
        console.log('[AppointmentsScreen] Normalized practitioners:', normalized.length);
        setPractitioners(normalized);
      }
    } catch (error) {
      console.log('[AppointmentsScreen] Practitioners fetch error:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchAppointments = async () => {
    console.log('[AppointmentsScreen] Fetching from API...');
    setRefreshing(true);
    const patientId = await AsyncStorage.getItem('patientId');
    if (!patientId) {
      console.log('[AppointmentsScreen] No patientId found');
      setRefreshing(false);
      setLoading(false);
      return;
    }

    try {
      const result = await AppointmentApi.getHistory(patientId);
      
      if (result.success && result.data) {
        // Handle different response structures - API returns data.data
        let rawList = [];
        if (result.data.data && Array.isArray(result.data.data)) {
          rawList = result.data.data;
        } else if (Array.isArray(result.data)) {
          rawList = result.data;
        } else if (result.data.appointments && Array.isArray(result.data.appointments)) {
          rawList = result.data.appointments;
        }
        
        console.log('[AppointmentsScreen] Raw list length:', rawList.length);
        
        const now = new Date();
        
        const upcoming = rawList
          .filter(a => {
            // Create full datetime for comparison
            const dateStr = a.commencing || a.appointmentDate || a.date || '';
            const timeStr = a.starttime || a.appointmentTime || a.time || '00:00';
            const apptDateTime = new Date(`${dateStr}T${timeStr}`);
            
            // Upcoming: datetime is in the future (regardless of status)
            return apptDateTime > now && (!a.status || (a.status !== 'Cancelled' && a.status !== 'Completed'));
          })
          .map(normalizeAppointment);

        const history = rawList
          .filter(a => {
            // Create full datetime for comparison
            const dateStr = a.commencing || a.appointmentDate || a.date || '';
            const timeStr = a.starttime || a.appointmentTime || a.time || '00:00';
            const apptDateTime = new Date(`${dateStr}T${timeStr}`);
            
            // History: datetime is in the past OR status is Cancelled/Completed
            return apptDateTime <= now || a.status === 'Cancelled' || a.status === 'Completed';
          })
          .map(normalizeAppointment);

        console.log('[AppointmentsScreen] Upcoming:', upcoming.length, 'History:', history.length);
        setAppointments(upcoming);
        setAppointmentHistory(history);
        
        // Today's appointments: use LOCAL date, include both upcoming + history
        // (so past-time today appointments still show on the Today tab)
        const today = getLocalDateYYYYMMDD();
        const merged = [...upcoming, ...history];
        const todayAppts = merged.filter(a => {
          const apptDate = toISODateKey(a.date);
          return apptDate === today;
        });
        console.log('[AppointmentsScreen] Today (local):', todayAppts.length);
        setTodayAppointments(todayAppts);
      }
    } catch (error) {
      console.log('[AppointmentsScreen] Fetch error:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const onRefresh = () => fetchAppointments();

  // Normalize appointment data from API
  const normalizeAppointment = (a) => ({
    id: String(a.id || a.appointmentId || Math.random()),
    doctor: a.diaryusername || a.doctorName || a.practitionerName || a.doctor || 'Dr.',
    specialty: a.apmttypetext || a.specialty || a.department || 'General Physician',
    date: a.commencing || a.appointmentDate || a.date || '',
    time: a.starttime || a.appointmentTime || a.time || '',
    location: a.clinicname || a.location || a.clinic || a.hospitalName || '',
    visitType: a.apmt_as || a.visitType || a.consultationType || 'In-Clinic',
    status: a.status || 'Scheduled',
    fee: Number(a.charge) || a.consultationFee || a.fee || null,
  });

  // Counts shown next to each tab label
  const tabCounts = {
    "Today's":    todayAppointments.length,
    "Upcoming":   appointments.length,
    "History":    appointmentHistory.length,
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Appointments</Text>
          <Text style={s.headerSub}>Manage & book your visits</Text>
        </View>
      </View>

      <TouchableOpacity style={s.bookBanner} onPress={() => navigation.navigate('DoctorSearch', {})} activeOpacity={0.88}>
        <View style={s.bookBannerDecor} />
        <View style={s.bookBannerLeft}>
          <Text style={s.bookBannerEyebrow}>START NOW</Text>
          <Text style={s.bookBannerTitle}>Book an Appointment</Text>
          <Text style={s.bookBannerSub}>Search from 100+ top doctors near you & book instantly</Text>
          <View style={s.bookBannerCtaRow}>
            <Text style={s.bookBannerCtaText}>Book Now</Text>
            <View style={s.bookBannerCtaArrow}>
              <ArrowRightIcon size={16} color={colors.primary} />
            </View>
          </View>
        </View>
        <View style={s.bookBannerIconWrap}>
          <View style={s.bookBannerIconRing}>
            <StethoscopeIcon size={36} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.searchBar} onPress={() => navigation.navigate('DoctorSearch', {})} activeOpacity={0.8}>
        <SearchIcon size={18} color={colors.textMuted} />
        <Text style={s.searchPlaceholder}>Search doctors, specialties…</Text>
      </TouchableOpacity>

      {/* Featured Doctors Section */}
      {practitioners.length > 0 && (
        <View style={s.doctorsSection}>
          <View style={s.specHeader}>
            <Text style={s.specHeading}>Available Doctors</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorSearch', {})}>
              <Text style={s.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={practitioners}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={s.doctorsList}
            renderItem={({item}) => {
              const initials = (item.name || '').replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
              const hue = (item.name?.charCodeAt(4) || 0) * 37 % 360;
              
              return (
                <TouchableOpacity
                  style={s.doctorCard}
                  onPress={() => navigation.navigate('DoctorProfile', {doctorId: item.id})}
                  activeOpacity={0.8}>
                  <View style={[s.doctorAvatar, {backgroundColor: `hsl(${hue},55%,88%)`}]}>
                    <Text style={[s.doctorAvatarText, {color: `hsl(${hue},45%,30%)`}]}>{initials}</Text>
                  </View>
                  <Text style={s.doctorName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.doctorSpecialty} numberOfLines={1}>{item.specialty}</Text>
                  <View style={s.doctorRating}>
                    <Text style={s.doctorRatingText}>⭐ {item.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={s.doctorFee}>₹{item.consultationFee}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {loadingDoctors && (
        <View style={{alignItems: 'center', paddingVertical: 12}}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{marginTop: 6, fontSize: 12, color: colors.textSecondary}}>Loading doctors…</Text>
        </View>
      )}

      <View style={s.tabRow}>
        {['Today\'s', 'Upcoming', 'History'].map(tab => {
          const count = tabCounts[tab] ?? 0;
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tab, isActive && s.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.85}>
              <View style={s.tabInner}>
                <Text style={[s.tabText, isActive && s.tabTextActive]}>{tab}</Text>
                <View style={[s.tabCountBadge, isActive && s.tabCountBadgeActive, count === 0 && s.tabCountBadgeZero]}>
                  <Text style={[s.tabCountText, isActive && s.tabCountTextActive, count === 0 && s.tabCountTextZero]}>
                    {count}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }>
        {loading ? (
          <View style={{alignItems: 'center', paddingVertical: 48}}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{marginTop: 12, fontSize: 13, color: colors.textSecondary}}>Loading appointments…</Text>
          </View>
        ) : (
          <>
            {activeTab === 'Today\'s' && (
              todayAppointments.length > 0
                ? todayAppointments.map(a => <AppointmentCard key={a.id} item={a} compact />)
                : <EmptyState icon={CalendarIcon} title="No appointments today"
                    sub="You don't have any appointments scheduled for today."
                    cta="Book Now" onCta={() => navigation.navigate('DoctorSearch', {})} />
            )}
            {activeTab === 'Upcoming' && (
              appointments.length > 0
                ? appointments.map(a => <AppointmentCard key={a.id} item={a} compact />)
                : <EmptyState icon={CalendarIcon} title="No upcoming appointments"
                    sub="Book a consultation with a doctor that fits your schedule."
                    cta="Book Now" onCta={() => navigation.navigate('DoctorSearch', {})} />
            )}
            {activeTab === 'History' && (
              appointmentHistory.length > 0
                ? appointmentHistory.map(a => <AppointmentCard key={a.id} item={a} showStatus compact />)
                : <EmptyState icon={DocumentIcon} title="No past appointments"
                    sub="Your completed and cancelled appointments will appear here." />
            )}
          </>
        )}
        <View style={{height: 24}} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AppointmentCard({item, showStatus, compact}) {
  const isOnline = item.visitType === 'Video Consult' || item.visitType === 'Audio Call';
  const initials = item.doctor?.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2) || '??';
  
  if (compact) {
    return (
      <View style={c.cardCompact}>
        <View style={c.compactLayout}>
          {/* Left section with doctor info */}
          <View style={c.leftSection}>
            <View style={c.avatarSmall}>
              <Text style={c.avatarTextSmall}>{initials}</Text>
            </View>
            <View style={c.infoCompact}>
              <Text style={c.docNameCompact}>{item.doctor}</Text>
              <Text style={c.specialtyCompact}>{item.specialty}</Text>
              {item.fee != null && (
                <Text style={c.feeCompactInline}>₹{item.fee}</Text>
              )}
            </View>
          </View>
          
          {/* Right section with date/time highlighted */}
          <View style={c.rightSection}>
            <View style={c.dateTimeBox}>
              <Text style={c.timeHighlight}>{item.time}</Text>
              <View style={c.dateLine} />
              <Text style={c.dateHighlight}>{item.date}</Text>
            </View>
            {showStatus && (
              <View style={c.statusTagWrapper}>
                {item.status === 'Completed' ? (
                  <View style={c.completedTag}>
                    <Text style={c.completedTagText}>✓ Completed</Text>
                  </View>
                ) : item.status === 'Cancelled' ? (
                  <View style={c.cancelledTag}>
                    <Text style={c.cancelledTagText}>✕ Cancelled</Text>
                  </View>
                ) : (
                  <StatusChip status={item.status} size="xs" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View style={c.card}>
      <View style={c.topRow}>
        <View style={c.avatar}>
          <Text style={c.avatarText}>{initials}</Text>
        </View>
        <View style={c.info}>
          <Text style={c.docName}>{item.doctor}</Text>
          <Text style={c.specialty}>{item.specialty}</Text>
        </View>
        {showStatus && <StatusChip status={item.status} size="xs" />}
      </View>
      <View style={c.divider} />
      <View style={c.metaRow}>
        <MetaItem icon={CalendarIcon} text={item.date} />
        <MetaItem icon={ClockIcon}    text={item.time} />
        <MetaItem icon={isOnline ? VideoIcon : PinIcon} text={isOnline ? 'Online' : item.location} />
      </View>
      <View style={c.bottomRow}>
        <View style={c.visitTag}>
          <Text style={c.visitTagText}>{item.visitType || 'In-Clinic'}</Text>
        </View>
        {item.fee != null && <Text style={c.fee}>₹{item.fee}</Text>}
      </View>
    </View>
  );
}

function MetaItem({icon: Icon, text}) {
  return (
    <View style={c.metaItem}>
      <Icon size={12} color={colors.textSecondary} />
      <Text style={c.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function EmptyState({icon: Icon, title, sub, cta, onCta}) {
  return (
    <View style={e.wrap}>
      <Icon size={48} color={colors.textMuted} />
      <Text style={e.title}>{title}</Text>
      <Text style={e.sub}>{sub}</Text>
      {cta && (
        <TouchableOpacity style={e.btn} onPress={onCta} activeOpacity={0.85}>
          <Text style={e.btnText}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  card:        {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.sm},
  topRow:      {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  avatar:      {width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  avatarText:  {fontSize: 15, fontWeight: '800', color: colors.primary},
  info:        {flex: 1},
  docName:     {fontSize: 14, fontWeight: '800', color: colors.textPrimary},
  specialty:   {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  divider:     {height: 1, backgroundColor: colors.border, marginVertical: spacing.md},
  metaRow:     {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap'},
  metaItem:    {flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 100},
  metaEmoji:   {fontSize: 12},
  metaText:    {fontSize: 12, color: colors.textSecondary, flex: 1},
  bottomRow:   {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  visitTag:    {backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full},
  visitTagText:{fontSize: 11, fontWeight: '700', color: colors.primary},
  fee:         {fontSize: 15, fontWeight: '800', color: colors.textPrimary},
  
  // Compact card styles with highlighted date/time
  cardCompact:        {
    backgroundColor: colors.surface, 
    borderRadius: radius.lg, 
    padding: spacing.md, 
    marginBottom: spacing.sm, 
    ...shadows.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  compactLayout:      {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  leftSection:        {flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  rightSection:       {alignItems: 'flex-end'},
  avatarSmall:        {width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  avatarTextSmall:    {fontSize: 14, fontWeight: '800', color: colors.primary},
  infoCompact:        {flex: 1},
  docNameCompact:     {fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2},
  specialtyCompact:   {fontSize: 11, color: colors.textSecondary, marginBottom: 4},
  feeCompactInline:   {fontSize: 12, fontWeight: '700', color: colors.primary},
  
  // Highlighted date/time box
  dateTimeBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 85,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
  },
  timeHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  dateLine: {
    width: 30,
    height: 1,
    backgroundColor: colors.primary + '40',
    marginVertical: 4,
  },
  dateHighlight: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Status tags
  statusTagWrapper: {
    marginTop: spacing.xs,
  },
  completedTag: {
    backgroundColor: '#DCFCE7',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  completedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  cancelledTag: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelledTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
    letterSpacing: 0.3,
  },
});

const e = StyleSheet.create({
  wrap:    {alignItems: 'center', paddingVertical: spacing['4xl'], paddingHorizontal: spacing.xl},
  emoji:   {fontSize: 48, marginBottom: spacing.md},
  title:   {fontSize: 17, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm},
  sub:     {fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg},
  btn:     {backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full},
  btnText: {color: '#fff', fontWeight: '700', fontSize: 14},
});

const s = StyleSheet.create({
  safe:              {flex: 1, backgroundColor: colors.background},
  header:            {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingTop: spacing['4xl'], paddingBottom: spacing.base, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  backBtn:           {padding: 4},
  headerText:        {flex: 1},
  headerTitle:       {fontSize: 20, fontWeight: '900', color: colors.textPrimary},
  headerSub:         {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  bookBanner:        {position: 'relative', overflow: 'hidden', margin: spacing.base, marginTop: spacing.md, borderRadius: radius.xl, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.lg, borderWidth: 1, borderColor: colors.primary + '40'},
  bookBannerDecor:   {position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)'},
  bookBannerLeft:    {flex: 1, zIndex: 1},
  bookBannerEyebrow: {fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.2, marginBottom: 6},
  bookBannerTitle:   {fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6, letterSpacing: 0.3},
  bookBannerSub:     {fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 18, marginBottom: spacing.md + 2, paddingRight: spacing.sm},
  bookBannerCtaRow:  {flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm, borderRadius: radius.full, gap: 6},
  bookBannerCtaText: {fontSize: 14, fontWeight: '800', color: colors.primary},
  bookBannerCtaArrow:{width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  bookBannerIconWrap:{alignItems: 'center', justifyContent: 'center', zIndex: 1, marginLeft: spacing.sm},
  bookBannerIconRing:{width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)'},
  searchBar:         {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.base, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border},
  searchPlaceholder: {fontSize: 14, color: colors.textMuted, flex: 1},
  specSection:       {marginBottom: spacing.sm},
  specHeader:        {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, marginBottom: spacing.sm},
  specHeading:       {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  viewAll:           {fontSize: 13, color: colors.primary, fontWeight: '600'},
  specList:          {paddingHorizontal: spacing.base, gap: spacing.sm},
  specChip:          {alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.lg, minWidth: 90, gap: spacing.sm},
  specIconWrap:      {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  specChipName:      {fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13},
  
  // Doctors section
  doctorsSection:    {marginBottom: spacing.md},
  doctorsList:       {paddingHorizontal: spacing.base, gap: spacing.md},
  doctorCard:        {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, width: 130, alignItems: 'center', ...shadows.sm, borderWidth: 1, borderColor: colors.border},
  doctorAvatar:      {width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm},
  doctorAvatarText:  {fontSize: 18, fontWeight: '900'},
  doctorName:        {fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 4},
  doctorSpecialty:   {fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm},
  doctorRating:      {backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, marginBottom: spacing.xs},
  doctorRatingText:  {fontSize: 10, fontWeight: '700', color: colors.primary},
  doctorFee:         {fontSize: 14, fontWeight: '800', color: colors.primary},
  
  tabRow:            {flexDirection: 'row', paddingHorizontal: spacing.base, gap: spacing.sm, marginBottom: spacing.sm},
  tab:               {paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border},
  tabActive:         {backgroundColor: colors.primary, borderColor: colors.primary},
  tabInner:          {flexDirection: 'row', alignItems: 'center', gap: 6},
  tabText:           {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  tabTextActive:     {color: '#fff', fontWeight: '700'},
  tabCountBadge:     {minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  tabCountBadgeActive:{backgroundColor: 'rgba(255,255,255,0.25)'},
  tabCountBadgeZero: {backgroundColor: 'transparent', minWidth: 18, height: 18, paddingHorizontal: 0},
  tabCountText:      {fontSize: 10, fontWeight: '800', color: colors.textPrimary},
  tabCountTextActive:{color: '#fff'},
  tabCountTextZero:  {color: colors.textMuted},
  list:              {paddingHorizontal: spacing.base},
});