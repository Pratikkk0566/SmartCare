import React, {useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {specialties} from '../../data/mockData';
import {ArrowBackIcon, SearchIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

export default function AppointmentsScreen({navigation}) {
  const {appointments, appointmentHistory} = useApp();
  const [activeTab, setActiveTab] = useState('Upcoming');

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
        <View style={s.bookBannerLeft}>
          <Text style={s.bookBannerTitle}>Book an Appointment</Text>
          <Text style={s.bookBannerSub}>Search from 100+ doctors near you</Text>
        </View>
        <View style={s.bookBannerIcon}>
          <Text style={{fontSize: 26}}>🩺</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.searchBar} onPress={() => navigation.navigate('DoctorSearch', {})} activeOpacity={0.8}>
        <SearchIcon size={18} color={colors.textMuted} />
        <Text style={s.searchPlaceholder}>Search doctors, specialties…</Text>
      </TouchableOpacity>

      <View style={s.specSection}>
        <View style={s.specHeader}>
          <Text style={s.specHeading}>Browse by Specialty</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DoctorSearch', {})}>
            <Text style={s.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={specialties}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={s.specList}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[s.specChip, {backgroundColor: item.bgColor}]}
              onPress={() => navigation.navigate('DoctorSearch', {specialtyId: item.id})}
              activeOpacity={0.8}>
              <Text style={s.specEmoji}>{item.emoji}</Text>
              <Text style={[s.specChipName, {color: item.color}]} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={s.tabRow}>
        {['Upcoming', 'History'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {activeTab === 'Upcoming' && (
          appointments.length > 0
            ? appointments.map(a => <AppointmentCard key={a.id} item={a} />)
            : <EmptyState emoji="📅" title="No upcoming appointments"
                sub="Book a consultation with a doctor that fits your schedule."
                cta="Book Now" onCta={() => navigation.navigate('DoctorSearch', {})} />
        )}
        {activeTab === 'History' && (
          appointmentHistory.length > 0
            ? appointmentHistory.map(a => <AppointmentCard key={a.id} item={a} showStatus />)
            : <EmptyState emoji="🗂️" title="No past appointments"
                sub="Your completed and cancelled appointments will appear here." />
        )}
        <View style={{height: 24}} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AppointmentCard({item, showStatus}) {
  const isOnline = item.visitType === 'Video Consult' || item.visitType === 'Audio Call';
  const initials = item.doctor?.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2) || '??';
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
        <MetaItem emoji="📅" text={item.date} />
        <MetaItem emoji="🕐" text={item.time} />
        <MetaItem emoji={isOnline ? '💻' : '📍'} text={isOnline ? 'Online' : item.location} />
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

function MetaItem({emoji, text}) {
  return (
    <View style={c.metaItem}>
      <Text style={c.metaEmoji}>{emoji}</Text>
      <Text style={c.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function EmptyState({emoji, title, sub, cta, onCta}) {
  return (
    <View style={e.wrap}>
      <Text style={e.emoji}>{emoji}</Text>
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
  bookBanner:        {margin: spacing.base, borderRadius: radius.lg, backgroundColor: colors.primary, padding: spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.md},
  bookBannerLeft:    {flex: 1},
  bookBannerTitle:   {fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4},
  bookBannerSub:     {fontSize: 12, color: 'rgba(255,255,255,0.8)'},
  bookBannerIcon:    {width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center'},
  searchBar:         {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.base, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border},
  searchPlaceholder: {fontSize: 14, color: colors.textMuted, flex: 1},
  specSection:       {marginBottom: spacing.sm},
  specHeader:        {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, marginBottom: spacing.sm},
  specHeading:       {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  viewAll:           {fontSize: 13, color: colors.primary, fontWeight: '600'},
  specList:          {paddingHorizontal: spacing.base, gap: spacing.sm},
  specChip:          {alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.lg, minWidth: 76, gap: 6},
  specEmoji:         {fontSize: 22},
  specChipName:      {fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 15},
  tabRow:            {flexDirection: 'row', paddingHorizontal: spacing.base, gap: spacing.sm, marginBottom: spacing.sm},
  tab:               {paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border},
  tabActive:         {backgroundColor: colors.primary, borderColor: colors.primary},
  tabText:           {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  tabTextActive:     {color: '#fff', fontWeight: '700'},
  list:              {paddingHorizontal: spacing.base},
});