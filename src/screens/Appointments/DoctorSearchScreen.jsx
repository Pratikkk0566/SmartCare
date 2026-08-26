import React, {useState, useMemo, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {PractitionerApi} from '../../API/Api';
import {ArrowBackIcon, SearchIcon, StarIcon, PinIcon, StethoscopeIcon, HeartIcon, ToothIcon, SkinIcon, BabyIcon, BoneIcon, BrainIcon, EarIcon, CheckIcon, SortIcon, ChevronDownIcon, FilterIcon} from '../../assets/icons/Icons';

// Local specialties constant — no API endpoint for this
// This will be replaced by dynamic specialties from API

const SORT_OPTIONS = [
  {id: 'best',    label: 'Best Match'},
  {id: 'rating',  label: 'Top Rated'},
  {id: 'feeLow',  label: 'Fee: Low–High'},
  {id: 'feeHigh', label: 'Fee: High–Low'},
  {id: 'exp',     label: 'Experience'},
];

export default function DoctorSearchScreen({navigation, route}) {
  const preSpecialtyId = route.params?.specialtyId || null;
  const {practitioners: cachedPractitioners} = useApp();
  const [practitioners, setPractitioners] = useState(cachedPractitioners);
  const [specialties, setSpecialties] = useState([]); // Dynamic specialties from API
  const [loading, setLoading] = useState(false);
  const [query,      setQuery]      = useState('');
  const [specFilter, setSpecFilter] = useState(preSpecialtyId);
  const [sortBy,     setSortBy]     = useState('best');
  const [showSort,   setShowSort]   = useState(false);
  const [showSpecDropdown, setShowSpecDropdown] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  // Fetch practitioners on screen focus
  useFocusEffect(
    useCallback(() => {
      // Always fetch all specialties first, then filter
      fetchAllSpecialtiesAndPractitioners();
    }, [])
  );

  const fetchAllSpecialtiesAndPractitioners = async () => {
    setLoading(true);
    try {
      // First fetch ALL practitioners to get all available specialties
      const allResult = await PractitionerApi.getList("1", 0, 0);
      
      if (allResult.success) {
        const allData = allResult.data;
        const allList = allData?.practitionerList || [];
        
        // Extract ALL unique specializations for chips (never changes)
        const uniqueSpecs = new Map();
        allList.forEach(p => {
          if (p.specializationid && p.specialization_name) {
            uniqueSpecs.set(p.specializationid, {
              id: p.specializationid,
              name: p.specialization_name,
              Icon: StethoscopeIcon, // Default icon
              color: '#6C63FF',
              bgColor: '#EEE9FF'
            });
          }
        });
        
        const allSpecialties = Array.from(uniqueSpecs.values()).sort((a, b) => a.name.localeCompare(b.name));
        console.log('[DoctorSearch] All specialties loaded:', allSpecialties.length);
        setSpecialties(allSpecialties);
        
        // Now fetch filtered practitioners based on current filter
        await fetchFilteredPractitioners(specFilter, allList);
      }
    } catch (error) {
      console.log('[DoctorSearch] Fetch error:', error);
      setPractitioners(cachedPractitioners);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredPractitioners = async (specialtyFilter = null, allPractitioners = null) => {
    try {
      let list = [];
      
      if (allPractitioners) {
        // Use already fetched data and filter locally
        list = allPractitioners;
      } else {
        // Fetch specific specialty or all if no filter
        const specializationid = specialtyFilter ? Number(specialtyFilter) : 0;
        const result = await PractitionerApi.getList("1", specializationid, 0);
        
        if (result.success) {
          const rawData = result.data;
          list = rawData?.practitionerList || [];
        }
      }
      
      console.log('[DoctorSearch] Processing practitioners:', list.length);
      
      const normalized = Array.isArray(list) ? list.map(p => {
        const getId = () => {
          const candidates = [
            p.id, p.practitionerId, p.diaryuserid, p.diaryUserId, p.userId, p.user_id,
            p.doctorId, p.doctor_id, p.practionerId,
          ];
          for (const c of candidates) {
            if (c !== undefined && c !== null && String(c).trim() !== '') return c;
          }
          return Math.random().toString(36).substr(2, 9);
        };

        const getName = () => {
          const candidates = [
            p.practitionername, p.practitionerName, p.diaryuser, p.diaryUser, p.name, p.doctorName, p.userName,
            p.fullName, p.doctor_name, p.practitioner_name,
          ];
          for (const c of candidates) {
            if (c && String(c).trim() !== '') return c;
          }
          return 'Unknown Doctor';
        };

        const getSpecialty = () => {
          const candidates = [
            p.specialization_name, p.specialization, p.specialty, p.department,
          ];
          for (const c of candidates) {
            if (c && String(c).trim() !== '') return c;
          }
          return 'General Medicine';
        };

        const getQualifications = () => {
          const candidates = [
            p.owner_qualification, p.qualification, p.qualifications, p.degree,
          ];
          for (const c of candidates) {
            if (c && String(c).trim() !== '') return c;
          }
          return 'MBBS';
        };

        const practitionerId = getId();
        const practitionerName = getName();
        const specialty = getSpecialty();
        const qualifications = getQualifications();

        return {
          practitionerId,
          id: practitionerId,
          name: practitionerName,
          specialty: specialty,
          specializationid: p.specializationid,
          qualifications: qualifications,
          rating: Number(p.rating) || 4.5,
          reviewCount: Number(p.reviewCount || p.review_count) || Math.floor(Math.random() * 200) + 50,
          consultationFee: Number(p.consultationFee || p.charge || p.fee) || 500,
          experience: Number(p.experience) || Math.floor(Math.random() * 15) + 5,
          clinic: p.clinic || p.hospital || p.location || 'Main Clinic',
          avatar: p.avatar || p.photo || null,
          availability: 'Available Today',
          nextSlot: 'Today at 2:00 PM',
          _raw: p,
        };
      }).filter(p => p.practitionerId) : [];
      
      console.log('[DoctorSearch] Normalized practitioners:', normalized.length);
      setPractitioners(normalized);
    } catch (error) {
      console.log('[DoctorSearch] Filter fetch error:', error);
    }
  };

  const filtered = useMemo(() => {
    console.log('[DoctorSearch] Filtering - Input practitioners:', practitioners.length);
    let list = [...practitioners];
    
    if (specFilter) {
      console.log('[DoctorSearch] Specialty filter ID:', specFilter);
      list = list.filter(d => {
        const match = String(d.specializationid) === String(specFilter);
        if (!match) console.log('[DoctorSearch] Specialty mismatch:', d.specializationid, '!=', specFilter, '|', d.specialty);
        return match;
      });
    }
    
    if (query.trim()) {
      const q = query.toLowerCase();
      console.log('[DoctorSearch] Text query:', q);
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
    
    console.log('[DoctorSearch] Final filtered list:', list.length);
    return list;
  }, [query, specFilter, sortBy, practitioners]);

  const activeSort = SORT_OPTIONS.find(o => o.id === sortBy);

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
        {/* Specialty Dropdown */}
        <View style={s.filterRow}>
          <TouchableOpacity style={s.filterDropdown} onPress={() => setShowSpecDropdown(v => !v)}>
            <FilterIcon size={16} color={colors.textSecondary} />
            <Text style={s.filterDropdownText}>
              {specFilter 
                ? specialties.find(s => String(s.id) === String(specFilter))?.name || 'Select Specialty'
                : 'All Specialties'
              }
            </Text>
            <ChevronDownIcon size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={s.sortBtn} onPress={() => setShowSort(v => !v)}>
            <SortIcon size={13} color={colors.primary} />
            <Text style={s.sortBtnText}>{activeSort?.label}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.resultBar}>
          <Text style={s.resultCount}>
            {filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      </View>

      {/* Specialty Dropdown */}
      {showSpecDropdown && (
        <>
          {/* Background overlay to close dropdown */}
          <TouchableOpacity 
            style={s.dropdownOverlay} 
            activeOpacity={1}
            onPress={() => setShowSpecDropdown(false)}
          />
          <View style={s.specDropdown}>
            <ScrollView style={s.specDropdownScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[s.specOption, !specFilter && s.specOptionActive]}
                onPress={() => { 
                  setSpecFilter(null); 
                  setShowSpecDropdown(false); 
                }}>
                <Text style={[s.specOptionText, !specFilter && s.specOptionTextActive]}>All Specialties</Text>
                {!specFilter && <CheckIcon size={14} color={colors.primary} />}
              </TouchableOpacity>
              {specialties.map((spec, index) => {
                const active = String(specFilter) === String(spec.id);
                const isLast = index === specialties.length - 1;
                return (
                  <TouchableOpacity
                    key={spec.id}
                    style={[s.specOption, active && s.specOptionActive, isLast && {borderBottomWidth: 0}]}
                    onPress={() => { 
                      setSpecFilter(spec.id); 
                      setShowSpecDropdown(false); 
                    }}>
                    <Text style={[s.specOptionText, active && s.specOptionTextActive]}>{spec.name}</Text>
                    {active && <CheckIcon size={14} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

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

      {filtered.length === 0 && !loading
        ? <EmptySearch onClear={() => { setQuery(''); setSpecFilter(null); }} />
        : loading
        ? (
          <View style={{alignItems: 'center', paddingVertical: 48}}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{marginTop: 12, fontSize: 13, color: colors.textSecondary}}>Finding doctors…</Text>
          </View>
        )
        : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <DoctorCard doctor={item} onPress={() => navigation.navigate('BookingSlot', {
                doctorId: item.id, 
                doctorData: item // Pass the complete doctor data
              })} />
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
  
  // Filter Row
  filterRow:         {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  filterDropdown:    {flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, borderRadius: radius.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border},
  filterDropdownText:{fontSize: 14, color: colors.textPrimary, flex: 1},
  
  resultBar:         {paddingHorizontal: spacing.base, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  resultCount:       {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  
  // Dropdown Overlay
  dropdownOverlay:   {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 98},
  
  // Specialty Dropdown
  specDropdown:      {position: 'absolute', top: 115, left: spacing.base, right: spacing.base, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.lg, zIndex: 99, borderWidth: 1, borderColor: colors.border, overflow: 'hidden'},
  specDropdownScroll:{maxHeight: 250},
  specOption:        {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border},
  specOptionActive:  {backgroundColor: colors.primaryLight},
  specOptionText:    {fontSize: 14, fontWeight: '500', color: colors.textPrimary, flex: 1},
  specOptionTextActive:{fontWeight: '700', color: colors.primary},
  
  sortBtn:           {flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full},
  sortBtnText:       {fontSize: 12, fontWeight: '700', color: colors.primary},
  
  // Sort Dropdown (existing)
  sortDropdown:      {position: 'absolute', top: 120, right: spacing.base, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.lg, zIndex: 99, minWidth: 180, borderWidth: 1, borderColor: colors.border},
  sortOption:        {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border},
  sortOptionActive:  {backgroundColor: colors.primaryLight},
  sortOptionText:    {fontSize: 13, fontWeight: '500', color: colors.textPrimary},
  sortOptionTextActive:{fontWeight: '700', color: colors.primary},
  list:              {padding: spacing.base, paddingTop: spacing.md},
});