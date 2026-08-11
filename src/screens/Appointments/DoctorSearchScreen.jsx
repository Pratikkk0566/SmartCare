import React, {useState, useMemo, useRef, useEffect} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, SearchIcon, StarIcon, PinIcon, StethoscopeIcon, HeartIcon, ToothIcon, SkinIcon, BabyIcon, BoneIcon, BrainIcon, EarIcon, CheckIcon, SortIcon} from '../../assets/icons/Icons';

// Local specialties constant — no API endpoint for this
const specialties = [
  {id: 's1', name: 'General Physician', Icon: StethoscopeIcon, color: '#6C63FF', bgColor: '#EEE9FF'},
  {id: 's2', name: 'Cardiologist',      Icon: HeartIcon,       color: '#EF4444', bgColor: '#FEE2E2'},
  {id: 's3', name: 'Dentist',           Icon: ToothIcon,       color: '#3B82F6', bgColor: '#DBEAFE'},
  {id: 's4', name: 'Dermatologist',     Icon: SkinIcon,        color: '#22C55E', bgColor: '#DCFCE7'},
  {id: 's5', name: 'Pediatrician',      Icon: BabyIcon,        color: '#F59E0B', bgColor: '#FEF3C7'},
  {id: 's6', name: 'Orthopedic',        Icon: BoneIcon,        color: '#8B5CF6', bgColor: '#F5F3FF'},
  {id: 's7', name: 'Neurologist',       Icon: BrainIcon,       color: '#EC4899', bgColor: '#FCE7F3'},
  {id: 's8', name: 'ENT Specialist',    Icon: EarIcon,         color: '#14B8A6', bgColor: '#CCFBF1'},
];

const SORT_OPTIONS = [
  {id: 'best',    label: 'Best Match'},
  {id: 'rating',  label: 'Top Rated'},
  {id: 'feeLow',  label: 'Fee: Low–High'},
  {id: 'feeHigh', label: 'Fee: High–Low'},
  {id: 'exp',     label: 'Experience'},
];

export default function DoctorSearchScreen({navigation, route}) {
  const preSpecialtyId = route.params?.specialtyId || null;
  const {practitioners} = useApp();
  const [query,      setQuery]      = useState('');
  const [specFilter, setSpecFilter] = useState(preSpecialtyId);
  const [sortBy,     setSortBy]     = useState('best');
  const [showSort,   setShowSort]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  const filtered = useMemo(() => {
    let list = [...practitioners];
    if (specFilter) {
      const spec = specialties.find(s => s.id === specFilter);
      if (spec) list = list.filter(d => d.specialty === spec.name);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        (d.clinic || '').toLowerCase().includes(q),
      );
    }
    switch (sortBy) {
      case 'rating':  list.sort((a, b) => b.rating - a.rating); break;
      case 'feeLow':  list.sort((a, b) => a.consultationFee - b.consultationFee); break;
      case 'feeHigh': list.sort((a, b) => b.consultationFee - a.consultationFee); break;
      case 'exp':     list.sort((a, b) => b.experience - a.experience); break;
      default:        list.sort((a, b) => b.rating - a.rating); break;
    }
    return list;
  }, [query, specFilter, sortBy, practitioners]);

  const activeSort = SORT_OPTIONS.find(o => o.id === sortBy);
  const activeSpec = specialties.find(s => s.id === specFilter);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} hitSlop={8}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.searchWrap}>
          <SearchIcon size={16} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            placeholder="Search doctors, specialties…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.specRow} style={s.specScroll}>
          <TouchableOpacity style={[s.specChip, !specFilter && s.specChipActive]} onPress={() => setSpecFilter(null)}>
            <Text style={[s.specChipText, !specFilter && s.specChipTextActive]}>All</Text>
          </TouchableOpacity>
          {specialties.map(sp => {
            const active = specFilter === sp.id;
            return (
              <TouchableOpacity
                key={sp.id}
                style={[s.specChip, active && {backgroundColor: sp.color, borderColor: sp.color}]}
                onPress={() => setSpecFilter(active ? null : sp.id)}>
                <sp.Icon size={14} color={active ? '#fff' : sp.color} />
                <Text style={[s.specChipText, active && {color: '#fff'}]}>{sp.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.sortBar}>
          <Text style={s.resultCount}>
            {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}{activeSpec ? ` · ${activeSpec.name}` : ''}
          </Text>
          <TouchableOpacity style={s.sortBtn} onPress={() => setShowSort(v => !v)}>
            <SortIcon size={13} color={colors.primary} />
            <Text style={s.sortBtnText}>{activeSort?.label}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSort && (
        <View style={s.sortDropdown}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[s.sortOption, sortBy === opt.id && s.sortOptionActive]}
              onPress={() => { setSortBy(opt.id); setShowSort(false); }}>
              <Text style={[s.sortOptionText, sortBy === opt.id && s.sortOptionTextActive]}>{opt.label}</Text>
              {sortBy === opt.id && <CheckIcon size={14} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {filtered.length === 0
        ? <EmptySearch onClear={() => { setQuery(''); setSpecFilter(null); }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <DoctorCard doctor={item} onPress={() => navigation.navigate('DoctorProfile', {doctorId: item.id})} />
            )}
          />
        )
      }
    </SafeAreaView>
  );
}

function DoctorCard({doctor: d, onPress}) {
  const initials = d.name.replace('Dr. ', '').split(' ').map(w => w[0]).join('').slice(0, 2);
  const hue      = (d.name.charCodeAt(4) * 37) % 360;
  const isToday  = d.availability === 'Available Today';
  return (
    <TouchableOpacity style={dc.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[dc.avatar, {backgroundColor: `hsl(${hue},55%,88%)`}]}>
        <Text style={[dc.avatarText, {color: `hsl(${hue},45%,32%)`}]}>{initials}</Text>
      </View>
      <View style={dc.info}>
        <Text style={dc.name}>{d.name}</Text>
        <Text style={dc.spec}>{d.specialty} · {d.experience} yrs exp</Text>
        <View style={dc.ratingRow}>
          <StarIcon size={12} color="#F59E0B" />
          <Text style={dc.rating}>{d.rating.toFixed(1)}</Text>
          <Text style={dc.reviews}>({d.reviewCount.toLocaleString()} reviews)</Text>
        </View>
        <View style={dc.clinicRow}>
          <PinIcon size={12} color={colors.textMuted} />
          <Text style={dc.clinic} numberOfLines={1}>{d.clinic}</Text>
        </View>
        <View style={[dc.availBadge, {backgroundColor: isToday ? colors.successLight : colors.warningLight}]}>
          <Text style={[dc.availText, {color: isToday ? colors.success : colors.warning}]}>{d.nextSlot}</Text>
        </View>
      </View>
      <View style={dc.right}>
        <Text style={dc.fee}>₹{d.consultationFee}</Text>
        <Text style={dc.feeLabel}>consult fee</Text>
        <TouchableOpacity style={dc.bookBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={dc.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function EmptySearch({onClear}) {
  return (
    <View style={em.wrap}>
      <View style={em.iconWrap}>
        <SearchIcon size={36} color={colors.textMuted} />
      </View>
      <Text style={em.title}>No doctors found</Text>
      <Text style={em.sub}>Try a different name, specialty, or clear your filters.</Text>
      <TouchableOpacity style={em.btn} onPress={onClear}>
        <Text style={em.btnText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );
}

const dc = StyleSheet.create({
  card:       {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.sm, gap: spacing.md, alignItems: 'flex-start'},
  avatar:     {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  avatarText: {fontSize: 17, fontWeight: '900'},
  info:       {flex: 1, gap: 4},
  name:       {fontSize: 14, fontWeight: '800', color: colors.textPrimary},
  spec:       {fontSize: 12, color: colors.textSecondary},
  ratingRow:  {flexDirection: 'row', alignItems: 'center', gap: 4},
  rating:     {fontSize: 12, fontWeight: '700', color: colors.textPrimary},
  reviews:    {fontSize: 11, color: colors.textMuted},
  clinic:     {fontSize: 11, color: colors.textMuted},
  availBadge: {alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full},
  availText:  {fontSize: 10, fontWeight: '700'},
  right:      {alignItems: 'flex-end', gap: 4, flexShrink: 0},
  fee:        {fontSize: 16, fontWeight: '900', color: colors.primary},
  feeLabel:   {fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4},
  bookBtn:    {backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, marginTop: 6},
  bookBtnText:{color: '#fff', fontSize: 12, fontWeight: '800'},
});

const em = StyleSheet.create({
  wrap:     {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, paddingTop: 80},
  iconWrap: {width: 72, height: 72, borderRadius: 36, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md},
  title:   {fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm},
  sub:     {fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg},
  btn:     {backgroundColor: colors.primaryLight, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full},
  btnText: {color: colors.primary, fontWeight: '700', fontSize: 14},
});

const s = StyleSheet.create({
  safe:              {flex: 1, backgroundColor: colors.background},
  header:            {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  back:              {padding: 4},
  searchWrap:        {flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, borderRadius: radius.full, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border},
  searchInput:       {flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0},
  specScroll:        {flexShrink: 0, flexGrow: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  specRow:           {paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: 'center', flexGrow: 0},
  specChip:          {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border},
  specChipActive:    {backgroundColor: colors.primary, borderColor: colors.primary},
  specChipText:      {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
  specChipTextActive:{color: '#fff'},
  sortBar:           {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  resultCount:       {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  sortBtn:           {flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full},
  sortBtnText:       {fontSize: 12, fontWeight: '700', color: colors.primary},
  sortDropdown:      {position: 'absolute', top: 168, right: spacing.base, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.lg, zIndex: 99, minWidth: 180, borderWidth: 1, borderColor: colors.border},
  sortOption:        {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border},
  sortOptionActive:  {backgroundColor: colors.primaryLight},
  sortOptionText:    {fontSize: 13, fontWeight: '500', color: colors.textPrimary},
  sortOptionTextActive:{fontWeight: '700', color: colors.primary},
  list:              {padding: spacing.base, paddingTop: spacing.md},
});