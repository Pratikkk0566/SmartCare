import React, {useState, useMemo, useEffect, useCallback, useRef} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Platform, ActivityIndicator, Alert, Modal, Pressable, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {PrescriptionDB, MedicineDB} from '../../services/MedicationDatabaseService';
import {PrescriptionRepeatApi, computePrescriptionRelevance, relevanceStyle} from '../../API/Api';
import {ArrowBackIcon, FilterIcon, MedicinesIcon, CalendarIcon, ArrowRightIcon, SearchIcon, CapsuleIcon, PlusIcon, FileTextIcon, TrashIcon, EditIcon, AlertCircleIcon, CheckCircleIcon, ChevronRightIcon, ChevronDownIcon, UserIcon, HospitalIcon, PillIcon} from '../../assets/icons/Icons';
import {useApp} from '../../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DATE_FILTERS = ['All Time', 'Past Week', 'Past Month', 'Past 3 Months', 'Past 6 Months'];

function matchesDateFilter(item, filter) {
  if (filter === 'All Time' || !filter) return true;
  const t = getPrescriptionTimestamp(item);
  if (!t) return true;
  const now = Date.now();
  const diffDays = (now - t) / (1000 * 60 * 60 * 24);

  if (filter === 'Past Week') return diffDays >= 0 && diffDays <= 7;
  if (filter === 'Past Month') return diffDays >= 0 && diffDays <= 30;
  if (filter === 'Past 3 Months') return diffDays >= 0 && diffDays <= 90;
  if (filter === 'Past 6 Months') return diffDays >= 0 && diffDays <= 180;
  return true;
}

function splitDateTime(dt = '') {
  if (!dt) return {date: '', time: ''};
  const s = String(dt).trim();
  if (s.includes('T')) { const [d, t] = s.split('T'); return {date: d || '', time: (t || '').slice(0, 5)}; }
  if (s.includes(' ')) { const [d, t] = s.split(' '); return {date: d || '', time: (t || '').slice(0, 5)}; }
  return {date: s, time: ''};
}

function formatDoctorName(raw = '') {
  if (!raw || raw === 'Dr. Unknown') return '';
  let s = String(raw).trim();
  if (/^(dr\.?|dr)\s+/i.test(s)) {
    s = s.replace(/^(dr\.?|dr)\s+/i, '').trim();
  }
  return s ? `Dr. ${s}` : '';
}

function getPrescriptionTimestamp(p) {
  const dtStr = p?.lastmodified || p?.date || p?.createdAt || p?.dateDisplay || '';
  if (!dtStr) return 0;
  const s = String(dtStr).trim();
  // Handle formats like "2026-08-19 11:35:58" or ISO string
  const normalized = s.replace(/-/g, '/');
  const t = Date.parse(normalized);
  if (!isNaN(t)) return t;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
}

function formatDateDisplay(dateStr = '') {
  if (!dateStr) return '';
  const s = String(dateStr).split(' ')[0];
  const parts = s.split('-');
  if (parts.length !== 3) return s;
  let y, m, d;
  if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
  else if (parts[2].length === 4) { y = parts[2]; m = parts[1]; d = parts[0]; }
  else return s;
  const mi = parseInt(m, 10);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[mi - 1] || ''} ${y}`;
}



export default function PrescriptionsScreen({navigation}) {
  const {
    practitioners, userProfile, appReady,
    appointments, appointmentHistory, invoices,
    syncPrescriptionsToEngine,
  } = useApp();
  const isFetchingRef = useRef(false);
  const [localPrescriptions, setLocalPrescriptions] = useState([]);
  const [serverPrescriptions, setServerPrescriptions] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [loadingServer, setLoadingServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState(null);
  const [relevanceFilter, setRelevanceFilter] = useState('all'); // 'all' | 'active'
  const [dateFilter, setDateFilter] = useState('All Time');
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);

  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // ── Loaders wrapped in useCallback so they're safe in dep arrays ─────────
  const loadPrescriptions = useCallback(async () => {
    try {
      setLoadingLocal(true);
      const allPrescriptions = await PrescriptionDB.getAll();

      const enriched = await Promise.all(
        allPrescriptions.map(async (presc) => {
          const medicines = await MedicineDB.getByPrescriptionId(presc.id);
          return {
            ...presc,
            medicineCount: medicines.length,
            medicines: medicines,
          };
        })
      );

      // Sort local prescriptions by DATE DESC (closest/newest at top, farthest/oldest at bottom)
      enriched.sort((a, b) => {
        const ta = getPrescriptionTimestamp(a);
        const tb = getPrescriptionTimestamp(b);
        if (tb !== ta) return tb - ta;
        return Number(b.id || 0) - Number(a.id || 0);
      });

      setLocalPrescriptions(enriched);
    } catch (error) {
      console.error('[PrescriptionsScreen] Local load error:', error);
    } finally {
      setLoadingLocal(false);
    }
  }, []);

  const fetchServerPrescriptions = useCallback(async (isRefresh = false) => {
    // Avoid simultaneous duplicate fetches unless explicitly triggered by pull-to-refresh
    if (isFetchingRef.current && !isRefresh) return;
    isFetchingRef.current = true;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoadingServer(true);

      const patientId =
        userProfile?.patientId ||
        userProfile?.clientId  ||
        (await AsyncStorage.getItem('patientId'));

      if (!patientId) {
        console.warn('[PrescriptionsScreen] No patientId — skipping server fetch');
        setLoadingServer(false); setRefreshing(false);
        return;
      }

      // ── Step 1: Collect ONLY doctors the patient has actually visited or booked with ──
      // Instead of scanning all hospital doctors (which causes 50+ network calls),
      // we extract doctor IDs from the patient's actual appointment history and billing records.
      const practidsSet = new Set();

      // Extract direct numeric IDs from appointment records & invoices
      const addFromVisitedRecords = (list) => {
        (list || []).forEach(x => {
          const v = String(x?.diaryuserid || x?.diaryUserId || x?.practid || x?.practitionerId || x?.doctorId || x?.doctorid || '').trim();
          if (/^\d+$/.test(v)) practidsSet.add(v);
        });
      };
      addFromVisitedRecords(appointments);
      addFromVisitedRecords(appointmentHistory);
      addFromVisitedRecords(invoices);

      // Name-based matching: if an appointment/invoice only has doctor's name, find their ID in practitioners list
      const visitedDoctorNames = new Set();
      const addDoctorNames = (list) => {
        (list || []).forEach(x => {
          const name = String(x?.doctor || x?.doctorName || x?.practitionerName || x?.consultantName || '').trim().toLowerCase();
          if (name && name.length > 2) visitedDoctorNames.add(name);
        });
      };
      addDoctorNames(appointments);
      addDoctorNames(appointmentHistory);
      addDoctorNames(invoices);

      if (visitedDoctorNames.size > 0 && Array.isArray(practitioners)) {
        practitioners.forEach(p => {
          const pName = String(p.name || p.doctorName || p.practitionerName || '').trim().toLowerCase();
          const pId = String(p.diaryuserid || p.practitionerId || p.id || '').trim();
          if (pId && /^\d+$/.test(pId)) {
            for (const vName of visitedDoctorNames) {
              if (pName.includes(vName) || vName.includes(pName)) {
                practidsSet.add(pId);
                break;
              }
            }
          }
        });
      }

      const practids = [...practidsSet];

      // ── Step 2: Fetch server repeat prescriptions for visited doctors only ──
      console.log(`[PrescriptionsScreen] Fetching server prescriptions for clientid=${patientId}, visited practids=`, practids);
      const result = await PrescriptionRepeatApi.getAllForPatient(practids, patientId, { forceRefresh: isRefresh });

      if (!result.success) {
        console.warn('[PrescriptionsScreen] Server fetch failed:', result.error);
        return;
      }

      // Build a lookup of diaryuserid -> { name, specialty, qualifications }
      // Sources: practitioners list, then appointments (upcoming + history) as fallback
      const practLookup = new Map();
      const addLookup = (key, entry) => {
        if (!key || !/^\d+$/.test(key)) return;
        const existing = practLookup.get(key);
        // Merge — prefer the entry with a real name (don't let empty override real)
        if (!existing || (!existing.name && entry.name)) {
          practLookup.set(key, {
            name: entry.name || existing?.name || '',
            specialty: entry.specialty || existing?.specialty || '',
            qualifications: entry.qualifications || existing?.qualifications || '',
          });
        }
      };
      practitioners.forEach(p => {
        const key = String(p.diaryuserid || p.practitionerId || p.id || '');
        addLookup(key, {
          name: p.name || p.practitionername || p.practitionerName || p.doctorName || '',
          specialty: p.specialty || p.specialization_name || p.department || '',
          qualifications: p.qualifications || p.owner_qualification || '',
        });
      });
      const addFromAppointments = (list) => {
        (list || []).forEach(a => {
          const key = String(a?.diaryuserid || a?.diaryUserId || a?.practid || a?.practitionerId || a?.doctorId || '');
          const name = a?.doctorName || a?.practitionerName || a?.practitionername || a?.empname || a?.consultantname ||
            [a?.firstName, a?.lastName].filter(Boolean).join(' ') || a?.doctor || '';
          const specialty = a?.specialty || a?.department || a?.specialization || a?.specialization_name || '';
          const qual = a?.qualification || a?.qualifications || a?.owner_qualification || '';
          addLookup(key, {name, specialty, qualifications: qual});
        });
      };
      addFromAppointments(appointments);
      addFromAppointments(appointmentHistory);

      const raw = result.data || [];
      if (raw.length > 0) {
        console.log('[PrescriptionsScreen] First server raw sample:', JSON.stringify(raw[0], null, 2));
        console.log('[PrescriptionsScreen] Practitioners practLookup size:', practLookup.size,
          'keys:', [...practLookup.keys()].slice(0, 5).join(','));
      }

      // Normalize the server data.
      // Summary item only has: { id, lastmodified, is_visible, _doctorPractid, medicines:[], medicineCount }
      // Each medicine (from Step 2 detail API) has:
      //   { id, drug, dose, frequencyNote, duration, qty, genericname,
      //     priscdurationtype, routes, medicineid, remark, strength, dosage, ... }
      const normalized = raw.map((r, i) => {
        const idVal = String(r.id);

        // Date always comes from `lastmodified` summary field
        const lastmod = r.lastmodified || '';
        const {date, time} = splitDateTime(lastmod);
        const finalDate = date || '';

        const medsArr = Array.isArray(r.medicines) ? r.medicines : [];
        const medCount = medsArr.length || (r.medicineCount || 0);

        // Look up doctor name from the pract map via the stamped diaryuserid
        const practKey = String(r._doctorPractid || '').trim();
        const doctorHit = practKey ? practLookup.get(practKey) : null;
        const rawDoctorName = doctorHit ? (doctorHit.name || '') : '';
        const doctorName    = formatDoctorName(rawDoctorName);
        const department    = doctorHit ? (doctorHit.specialty || '') : '';
        const qualifications = doctorHit ? (doctorHit.qualifications || '') : '';

        // Display "Prescription #id" as the card title
        const displayName = `Prescription #${idVal}`;

        // Compute RELEVANCE: combines medicine duration expiry + lastmodified recency
        const relevance = computePrescriptionRelevance({
          medicines: medsArr,
          lastmodified: lastmod,
          date: finalDate,
        });

        return {
          id: idVal,
          serverId: idVal,
          source: 'server',
          name: displayName,
          doctorName,
          department,
          qualifications,
          _doctorPractid: r._doctorPractid,
          date: finalDate,
          time,
          lastmodified: lastmod,
          is_visible: r.is_visible,
          dateDisplay: formatDateDisplay(finalDate),
          timeDisplay: time,
          medicineCount: medCount,
          medicines: medsArr,
          relevanceLevel:     relevance.level,             // 'active' | 'expiring' | 'expired' | 'unknown'
          activeCount:        relevance.activeCount,
          expiringCount:      relevance.expiringCount,
          expiredCount:       relevance.expiredCount,
          unknownCount:       relevance.unknownCount,
          daysSinceModified:  relevance.daysSinceModified,
          medicinesRelevance: relevance.medicinesRelevance, // per-medicine array for detail screen
          _raw: r,
        };
      });

      // Sort strictly by DATE DESC: closest (newest) date at the top, farthest (oldest) date at the bottom
      normalized.sort((a, b) => {
        const ta = getPrescriptionTimestamp(a);
        const tb = getPrescriptionTimestamp(b);
        if (tb !== ta) return tb - ta;
        return Number(b.id || 0) - Number(a.id || 0);
      });

      setServerPrescriptions(normalized);
      console.log(`[PrescriptionsScreen] Loaded ${normalized.length} server prescriptions`);

      // Auto-sync into MedicationSchedulingEngine
      if (syncPrescriptionsToEngine && normalized.length > 0) {
        syncPrescriptionsToEngine(normalized, patientId).catch((e) =>
          console.warn('[PrescriptionsScreen] Engine sync error:', e.message)
        );
      }
    } catch (err) {
      console.error('[PrescriptionsScreen] Server fetch error:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingServer(false);
      setRefreshing(false);
    }
  }, [userProfile, practitioners, appointments, appointmentHistory, invoices]);

  // ── Screen Focus & Refresh Hooks ──────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadPrescriptions();
      if (appReady) {
        fetchServerPrescriptions(false);
      }
    }, [appReady, loadPrescriptions, fetchServerPrescriptions])
  );

  const onRefresh = async () => {
    await Promise.all([loadPrescriptions(), fetchServerPrescriptions(true)]);
  };

  const filteredLocal = useMemo(() => {
    let list = localPrescriptions;
    if (dateFilter !== 'All Time') {
      list = list.filter(p => matchesDateFilter(p, dateFilter));
    }
    if (!query) return list;
    const q = query.toLowerCase().trim();
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.doctorName && p.doctorName.toLowerCase().includes(q))
    );
  }, [localPrescriptions, query, dateFilter]);

  const filteredServer = useMemo(() => {
    const q = query.toLowerCase().trim();
    // Step 1: apply relevance filter (All / Active only)
    let list = serverPrescriptions;
    if (relevanceFilter === 'active') {
      list = list.filter(p => p.relevanceLevel === 'active' || p.relevanceLevel === 'expiring');
    }
    // Step 2: apply date filter
    if (dateFilter !== 'All Time') {
      list = list.filter(p => matchesDateFilter(p, dateFilter));
    }
    // Step 3: apply text search
    if (!q) return list;
    return list.filter(p => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (String(p.id).includes(q)) return true;
      if (p.dateDisplay && p.dateDisplay.toLowerCase().includes(q)) return true;
      if (p.doctorName && p.doctorName.toLowerCase().includes(q)) return true;
      if (p.department && p.department.toLowerCase().includes(q)) return true;
      if (Array.isArray(p.medicines)) {
        for (const m of p.medicines) {
          const drug = String(m.drug || m.name || '').toLowerCase();
          const gen  = String(m.genericname || '').toLowerCase();
          if (drug.includes(q) || gen.includes(q)) return true;
        }
      }
      return false;
    });
  }, [serverPrescriptions, query, relevanceFilter, dateFilter]);

  const handleCreateNew = () => {
    navigation.navigate('CreatePrescription');
  };

  const handleLongPress = (prescription) => {
    setSelectedPrescription(prescription);
    setShowActionModal(true);
  };

  const handleEdit = (prescription) => {
    setShowActionModal(false);
    // Navigate to AddMedicines to edit existing medicines in the prescription
    navigation.navigate('AddMedicines', { 
      prescriptionId: prescription.id,
      prescriptionName: prescription.name,
      isEditing: true,
    });
  };

  const handleDelete = (prescription) => {
    setSelectedPrescription(prescription);
    setExpandedPrescriptionId(null);
    setShowActionModal(false);
    setShowDeleteModal(true);
  };



  const confirmDelete = async () => {
    if (!selectedPrescription) return;
    
    try {
      setShowDeleteModal(false);
      setLoading(true);
      
      // Delete all medicines associated with this prescription
      const medicines = await MedicineDB.getByPrescriptionId(selectedPrescription.id);
      for (const medicine of medicines) {
        await MedicineDB.delete(medicine.id);
      }
      
      // Delete the prescription
      await PrescriptionDB.delete(selectedPrescription.id);
      
      // Reload prescriptions
      await loadPrescriptions();
      
      setSuccessMessage('Prescription deleted successfully');
      setShowSuccessModal(true);
      
      // Auto-hide success message
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      console.error('[PrescriptionsScreen] Delete error:', error);
      Alert.alert('Error', 'Failed to delete prescription');
    } finally {
      setLoading(false);
      setSelectedPrescription(null);
    }
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

  if (loadingLocal && !loadingServer && localPrescriptions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading prescriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalCount = filteredServer.length + filteredLocal.length;
  const hasAny = totalCount > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MedicineSchedule')}
              style={styles.filterIconBtn}
              activeOpacity={0.7}
              accessibilityLabel="Medication Schedule and Alarms">
              <CalendarIcon size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDateFilterModal(true)} style={styles.filterIconBtn} activeOpacity={0.7}>
              <FilterIcon size={22} color={dateFilter !== 'All Time' ? colors.primary : colors.textSecondary} />
              {dateFilter !== 'All Time' && <View style={styles.filterDot} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreateNew} style={styles.addBtn} activeOpacity={0.7}>
              <PlusIcon size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <SearchIcon size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search prescriptions, doctors, diagnosis..."
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

        {/* Active Date Filter Badge */}
        {dateFilter !== 'All Time' && (
          <View style={styles.activeDateFilterRow}>
            <View style={styles.activeDateFilterBadge}>
              <CalendarIcon size={12} color={colors.primary} />
              <Text style={styles.activeDateFilterText}>Date: {dateFilter}</Text>
              <TouchableOpacity onPress={() => setDateFilter('All Time')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.activeDateFilterClear}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Quick Action Cards (Top) ────────────────────────────── */}
        <TouchableOpacity
          style={styles.scheduleCard}
          onPress={() => navigation.navigate('MedicineSchedule')}
          activeOpacity={0.85}
        >
          <View style={styles.scheduleIcon}>
            <MedicinesIcon size={22} color={colors.primary} />
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleName}>Today's Medicine Schedule</Text>
            <Text style={styles.scheduleSub}>View your medicine timings for today</Text>
          </View>
          <ArrowRightIcon size={16} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createCard}
          onPress={handleCreateNew}
          activeOpacity={0.85}
        >
          <View style={styles.createIcon}>
            <PlusIcon size={22} color={colors.primary} />
          </View>
          <View style={styles.createInfo}>
            <Text style={styles.createName}>Create New Prescription</Text>
            <Text style={styles.createSub}>Add medicines and set up reminders</Text>
          </View>
          <ArrowRightIcon size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* ── Server Prescriptions Section ────────────────────────────── */}
        <View style={[styles.sectionHeaderRow, {marginTop: spacing.md}]}>
          <View style={styles.sectionTitleWrap}>
            <View style={[styles.sectionIcon, {backgroundColor: colors.primaryLight}]}>
              <HospitalIcon size={16} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>
              Hospital Prescriptions
            </Text>
            {loadingServer && (
              <ActivityIndicator size="small" color={colors.primary} style={{marginLeft: 8}} />
            )}
          </View>
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setRelevanceFilter('all')}
              style={[
                styles.filterChip,
                relevanceFilter === 'all' && styles.filterChipActive,
              ]}
              activeOpacity={0.7}>
              <Text style={[
                styles.filterChipText,
                relevanceFilter === 'all' && styles.filterChipTextActive,
              ]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRelevanceFilter('active')}
              style={[
                styles.filterChip,
                relevanceFilter === 'active' && styles.filterChipActive,
              ]}
              activeOpacity={0.7}>
              <Text style={[
                styles.filterChipText,
                relevanceFilter === 'active' && styles.filterChipTextActive,
              ]}>Active</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionCount, {marginLeft: 6}]}>
              {filteredServer.length}
            </Text>
          </View>
        </View>

        {filteredServer.length === 0 && !loadingServer ? (
          <View style={styles.subEmpty}>
            <Text style={styles.subEmptyText}>
              {practitioners.length === 0
                ? 'Doctor list loading — pull to refresh once loaded.'
                : 'No repeat prescriptions from clinic yet.'}
            </Text>
          </View>
        ) : (
          filteredServer.map((presc) => {
            const { cardClass, chipBg, chipFg, chipLabel } = relevanceStyle(
              presc.relevanceLevel,
              presc.daysSinceModified
            );
            // Dynamic label: Active → show "N active"; Expiring → show detail; Expired → days past
            let label = chipLabel;
            if (presc.relevanceLevel === 'active' && presc.activeCount > 0) {
              label = `${presc.activeCount} Active`;
            } else if (presc.relevanceLevel === 'expiring') {
              const n = presc.expiringCount || 1;
              label = `Finishing · ${n}`;
            } else if (presc.relevanceLevel === 'expired' && isFinite(presc.daysSinceModified)) {
              label = `${presc.daysSinceModified}d ago`;
            }
            const cardStyleClass = cardClass === 'prescCardServerNewest' ? styles.prescCardServerNewest
              : cardClass === 'prescCardServerRecent' ? styles.prescCardServerRecent
              : cardClass === 'prescCardServerOld' ? styles.prescCardServerOld
              : null;
            const handleOpen = () => {
              navigation.navigate('PrescriptionDetail', {prescription: presc});
            };
            return (
              <TouchableOpacity
                key={'srv-' + presc.id}
                style={[
                  styles.prescCard,
                  styles.prescCardServer,
                  cardStyleClass,
                ]}
                onPress={handleOpen}
                activeOpacity={0.8}
              >
                <View style={styles.prescCardContent}>
                  <View style={[styles.prescIcon, {backgroundColor: chipBg}]}>
                    <UserIcon size={22} color={chipFg} />
                  </View>
                  <View style={styles.prescInfo}>
                    <Text style={styles.prescDoctorName} numberOfLines={1}>
                      {presc.doctorName || 'Hospital / Clinic'}
                    </Text>
                    {presc.department ? (
                      <Text style={styles.prescDoctorDept} numberOfLines={1}>
                        {presc.department}{presc.qualifications ? ` • ${presc.qualifications}` : ''}
                      </Text>
                    ) : null}
                    <View style={styles.prescMetaRow}>
                      {presc.dateDisplay ? (
                        <View style={styles.metaChip}>
                          <CalendarIcon size={10} color={colors.textMuted} />
                          <Text style={styles.metaChipText}>{presc.dateDisplay}</Text>
                        </View>
                      ) : null}
                      <View style={styles.metaChip}>
                        <PillIcon size={10} color={colors.textMuted} />
                        <Text style={styles.metaChipText}>
                          {presc.medicineCount} medicine{presc.medicineCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>#{presc.id}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.prescRight}>
                    <View style={[styles.recencyChip, {backgroundColor: chipBg}]}>
                      <Text style={[styles.recencyChipText, {color: chipFg}]}>
                        {label}
                      </Text>
                    </View>
                  </View>
                  <ChevronRightIcon size={20} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Local Prescriptions Section ────────────────────────────── */}
        <View style={[styles.sectionHeaderRow, {marginTop: spacing['2xl']}]}>
          <View style={styles.sectionTitleWrap}>
            <View style={[styles.sectionIcon, {backgroundColor: '#FEF3C7'}]}>
              <CapsuleIcon size={16} color="#B45309" />
            </View>
            <Text style={styles.sectionTitle}>Your Prescriptions</Text>
          </View>
          <Text style={styles.sectionCount}>
            {filteredLocal.length}
          </Text>
        </View>

        {!hasAny ? (
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
            {filteredLocal.length === 0 && localPrescriptions.length > 0 ? (
              <View style={styles.subEmpty}>
                <Text style={styles.subEmptyText}>
                  No local prescriptions match "{query}"
                </Text>
              </View>
            ) : (
              filteredLocal.map((presc) => {
                const isExpanded = expandedPrescriptionId === presc.id;
                return (
                  <View 
                    key={'loc-' + presc.id}
                    style={[
                      styles.prescCard, 
                      presc.status === 'active' && styles.prescCardActive,
                      isExpanded && styles.prescCardExpanded,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.prescCardContent}
                      onPress={() => setExpandedPrescriptionId(isExpanded ? null : presc.id)}
                      onLongPress={() => handleLongPress(presc)}
                      activeOpacity={0.7}
                    >
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
                      {isExpanded ? (
                        <ChevronDownIcon size={20} color={colors.textMuted} />
                      ) : (
                        <ChevronRightIcon size={20} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <>
                        {presc.medicines && presc.medicines.length > 0 && (
                          <View style={styles.medicinesListSection}>
                            <Text style={styles.medicinesListTitle}>Medicines in this prescription:</Text>
                            {presc.medicines.map((med, idx) => (
                              <View key={med.id} style={styles.medicineItem}>
                                <View style={styles.medicineItemDot} />
                                <View style={styles.medicineItemContent}>
                                  <Text style={styles.medicineItemName}>{med.name}</Text>
                                  <Text style={styles.medicineItemDetails}>
                                    {med.dose} {med.unit} • {med.times?.length || 0}x daily
                                    {med.times && med.times.length > 0 && ` • ${med.times.join(', ')}`}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                        
                        <View style={styles.prescActionsExpanded}>
                          <TouchableOpacity
                            onPress={() => {
                              setExpandedPrescriptionId(null);
                              handleEdit(presc);
                            }}
                            style={[styles.expandedActionButton, styles.editActionButton]}
                            activeOpacity={0.7}>
                            <EditIcon size={20} color={colors.primary} />
                            <Text style={styles.editActionText}>Edit</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => {
                              setExpandedPrescriptionId(null);
                              handleDelete(presc);
                            }}
                            style={[styles.expandedActionButton, styles.deleteActionButton]}
                            activeOpacity={0.7}>
                            <TrashIcon size={20} color={colors.error} />
                            <Text style={styles.deleteActionText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowActionModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPrescription?.name}</Text>
              <Text style={styles.modalSubtitle}>Choose an action</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setShowActionModal(false);
                handleEdit(selectedPrescription);
              }}>
              <View style={[styles.modalOptionIcon, {backgroundColor: colors.primaryLight}]}>
                <EditIcon size={22} color={colors.primary} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Edit Prescription</Text>
                <Text style={styles.modalOptionDesc}>Modify prescription details</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => handleDelete(selectedPrescription)}>
              <View style={[styles.modalOptionIcon, {backgroundColor: `${colors.error}20`}]}>
                <TrashIcon size={22} color={colors.error} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, {color: colors.error}]}>Delete Prescription</Text>
                <Text style={styles.modalOptionDesc}>Remove permanently</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setShowActionModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDeleteModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.deleteIconContainer}>
              <AlertCircleIcon size={48} color={colors.error} />
            </View>
            
            <Text style={styles.deleteTitle}>Delete Prescription?</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete "{selectedPrescription?.name}"? {'\n'}
              This will also delete all associated medicines.
            </Text>
            
            <View style={styles.deleteActions}>
              <TouchableOpacity 
                style={[styles.deleteBtn, styles.deleteBtnCancel]}
                onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.deleteBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deleteBtn, styles.deleteBtnConfirm]}
                onPress={confirmDelete}>
                <Text style={styles.deleteBtnTextConfirm}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIconContainer}>
              <CheckCircleIcon size={48} color={colors.success} />
            </View>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateFilterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDateFilterModal(false)}>
          <Pressable style={styles.dateFilterModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setShowDateFilterModal(false)} style={styles.dateModalCloseBtn}>
                <Text style={styles.dateModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateModalOptions}>
              {DATE_FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.dateOption, dateFilter === f && styles.dateOptionSelected]}
                  onPress={() => {
                    setDateFilter(f);
                    setShowDateFilterModal(false);
                  }}
                  activeOpacity={0.7}>
                  <Text style={[styles.dateOptionText, dateFilter === f && styles.dateOptionTextSelected]}>{f}</Text>
                  {dateFilter === f && (
                    <View style={styles.dateCheckIcon}>
                      <Text style={styles.dateCheckIconText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base},
  back: {padding: 4},
  headerTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  filterIconBtn: {padding: 4, position: 'relative'},
  filterDot: {position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary},
  addBtn: {padding: 4},
  activeDateFilterRow: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md},
  activeDateFilterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '30',
  },
  activeDateFilterText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  activeDateFilterClear: {fontSize: 12, fontWeight: '800', color: colors.primary, marginLeft: 4},
  
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
  
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary},
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subEmpty: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
  subEmptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  prescCardServer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  prescMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  metaChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  diagnosisLine: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  serverExpandSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  fieldRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  fieldLabel: {
    width: 88,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingTop: 2,
  },
  fieldValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  
  empty: {alignItems: 'center', paddingVertical: spacing['3xl']},
  
  prescCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadows.sm,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  prescCardActive: {
    borderColor: colors.primary,
  },
  prescCardExpanded: {
    ...shadows.lg,
  },
  prescCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
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
  prescDoctorName: {fontSize: 15, fontWeight: '800', color: colors.textPrimary},
  prescDoctorDept: {fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600'},
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
  
  prescActionsExpanded: {
    flexDirection: 'row', 
    gap: spacing.xs, 
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandedActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  editActionButton: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteActionButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  deleteActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  
  // Medicines List in Expanded Card
  medicinesListSection: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  medicinesListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  medicineItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  medicineItemContent: {
    flex: 1,
  },
  medicineItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  medicineItemDetails: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.sm,
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleInfo: {flex: 1},
  scheduleName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  scheduleSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createInfo: {flex: 1},
  createName: {fontSize: 14, fontWeight: '700', color: colors.primary},
  createSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  modalOptionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalCancelBtn: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  
  // Delete Modal Styles
  deleteIconContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  deleteMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  deleteBtnCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  deleteBtnConfirm: {
    backgroundColor: colors.error,
  },
  deleteBtnTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteBtnTextConfirm: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  
  // Success Modal Styles
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  successContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.lg,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: `${colors.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  recencyChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  recencyChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  prescCardServerNewest: {
    borderLeftWidth: 3,
    borderLeftColor: '#047857',
    backgroundColor: '#F7FEFB',
    borderColor: '#A7F3D0',
  },
  prescCardServerRecent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface,
    borderColor: '#C7D2FE',
  },
  prescCardServerOld: {
    borderLeftWidth: 3,
    borderLeftColor: '#9CA3AF',
    backgroundColor: colors.surface,
    opacity: 0.9,
  },
  medicineItemGeneric: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  medicineItemRemark: {
    marginTop: 4,
    fontSize: 11,
    color: '#A16207',
    fontWeight: '500',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },

  // Date Filter Modal Styles
  dateFilterModal: {backgroundColor: colors.surface, borderRadius: radius.xl, width: '100%', maxWidth: 320, ...shadows.lg},
  dateModalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border},
  dateModalTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  dateModalCloseBtn: {width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
  dateModalCloseText: {fontSize: 18, color: colors.textMuted, fontWeight: '600'},
  dateModalOptions: {padding: spacing.base},
  dateOption: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, borderRadius: radius.md, marginBottom: spacing.xs},
  dateOptionSelected: {backgroundColor: colors.primaryLight},
  dateOptionText: {fontSize: 15, color: colors.textPrimary, fontWeight: '500'},
  dateOptionTextSelected: {color: colors.primary, fontWeight: '700'},
  dateCheckIcon: {width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
  dateCheckIconText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});
