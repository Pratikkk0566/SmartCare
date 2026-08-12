import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {
  ArrowBackIcon,
  PlusIcon,
  CapsuleIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  CalendarIcon,
  PillIcon,
  BottleIcon,
  SyringeIcon,
  SprayIcon,
  BandageIcon,
  ToolsKitchen2Icon,
  AppleIcon,
  BowlIcon,
  BoxMultipleIcon,
  ChevronRightIcon,
  HashIcon,
  EditIcon,
  XIcon,
  AlertCircleIcon,
} from '../../assets/icons/Icons';
import {MedicineDB} from '../../services/MedicationDatabaseService';
import {MedicineApi} from '../../API/Api';

const MEDICINE_TYPES = [
  {value: 'tablet', label: 'Tablet', Icon: PillIcon, color: '#3B82F6', unit: 'tablet', needsQuantity: true},
  {value: 'capsule', label: 'Capsule', Icon: CapsuleIcon, color: '#8B5CF6', unit: 'capsule', needsQuantity: true},
  {value: 'syrup', label: 'Syrup', Icon: BottleIcon, color: '#EC4899', unit: 'ml', needsQuantity: true},
  {value: 'injection', label: 'Injection', Icon: SyringeIcon, color: '#EF4444', unit: 'vial', needsQuantity: true},
  {value: 'drops', label: 'Drops', Icon: SprayIcon, color: '#06B6D4', unit: 'drop', needsQuantity: true},
  {value: 'cream', label: 'Cream/Ointment', Icon: BandageIcon, color: '#10B981', unit: 'application', needsQuantity: false},
  {value: 'inhaler', label: 'Inhaler', Icon: SprayIcon, color: '#F59E0B', unit: 'puff', needsQuantity: true},
];

// Debug: Check if any icons are undefined
MEDICINE_TYPES.forEach(type => {
  if (!type.Icon) {
    console.error(`[AddMedicines] Icon is undefined for type: ${type.label}`);
  }
});

const FREQUENCIES = [
  {value: 'once_daily', label: 'Once a Day', short: '1x/day', defaultTimes: ['08:00 AM'], timesPerDay: 1},
  {value: 'twice_daily', label: 'Twice a Day', short: '2x/day', defaultTimes: ['08:00 AM', '08:00 PM'], timesPerDay: 2},
  {value: 'thrice_daily', label: '3 Times a Day', short: '3x/day', defaultTimes: ['08:00 AM', '02:00 PM', '08:00 PM'], timesPerDay: 3},
  {value: 'four_times_daily', label: '4 Times a Day', short: '4x/day', defaultTimes: ['08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM'], timesPerDay: 4},
  {value: 'custom', label: 'Custom Times', short: 'Custom', defaultTimes: [], timesPerDay: 0},
];

const FOOD_INSTRUCTIONS = [
  {value: 'before_food', label: 'Before Food', Icon: ClockIcon, color: '#F59E0B'},
  {value: 'after_food', label: 'After Food', Icon: BowlIcon, color: '#10B981'},
  {value: 'with_food', label: 'With Food', Icon: AppleIcon, color: '#3B82F6'},
  {value: 'empty_stomach', label: 'Empty Stomach', Icon: ToolsKitchen2Icon, color: '#8B5CF6'},
];

const TIME_PRESETS = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
  '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM',
];

export default function AddMedicinesScreen({navigation, route}) {
  const {prescriptionId, prescriptionName} = route.params;

  const [medicines, setMedicines] = useState([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState(null);
  const [selectedPresetTime, setSelectedPresetTime] = useState('08:00 AM');
  
  const [currentMedicine, setCurrentMedicine] = useState({
    name: '',
    type: 'tablet',
    unit: 'tablet',
    dose: '1',
    totalQuantity: '',
    frequency: 'twice_daily',
    customTimes: ['08:00 AM', '08:00 PM'],
    foodInstruction: 'after_food',
    durationDays: '0',
    remainingDoses: 0,
    instructions: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Medicine name search
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);

  const selectedTypeDetails = MEDICINE_TYPES.find(t => t.value === currentMedicine.type);

  // Debounced medicine name search — fires 400ms after typing stops, min 3 chars
  const handleNameChange = (text) => {
    setCurrentMedicine(prev => ({...prev, name: text}));

    // Clear any pending search
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const result = await MedicineApi.search(text.trim());
      setIsSearching(false);
      if (result.success && result.data.length > 0) {
        setSuggestions(result.data);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);
  };

  const selectSuggestion = (item) => {
    // item could be a string or an object with a name field — handle both
    const name = typeof item === 'string' ? item : (item.name || item.medicineName || item.brandName || String(item));
    setCurrentMedicine(prev => ({...prev, name}));
    setSuggestions([]);
    setShowSuggestions(false);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  // AUTO-CALCULATE duration based on quantity and frequency
  useEffect(() => {
    if (!selectedTypeDetails?.needsQuantity) {
      setCurrentMedicine(prev => ({...prev, durationDays: '0', remainingDoses: 0}));
      return;
    }

    if (currentMedicine.totalQuantity && currentMedicine.dose) {
      const quantity = parseFloat(currentMedicine.totalQuantity) || 0;
      const dosePerTime = parseFloat(currentMedicine.dose) || 1;
      const timesPerDay = currentMedicine.customTimes.length;
      
      const totalDosesPerDay = dosePerTime * timesPerDay;
      const calculatedDays = Math.floor(quantity / totalDosesPerDay);
      const remainingDoses = quantity - (calculatedDays * totalDosesPerDay);
      
      setCurrentMedicine(prev => ({
        ...prev,
        durationDays: calculatedDays.toString(),
        remainingDoses: remainingDoses > 0 ? Math.floor(remainingDoses / dosePerTime) : 0,
      }));
    }
  }, [currentMedicine.totalQuantity, currentMedicine.dose, currentMedicine.customTimes.length, selectedTypeDetails]);

  // Update custom times when frequency changes
  useEffect(() => {
    const freq = FREQUENCIES.find(f => f.value === currentMedicine.frequency);
    if (freq && freq.value !== 'custom' && freq.defaultTimes.length > 0) {
      setCurrentMedicine(prev => ({
        ...prev,
        customTimes: [...freq.defaultTimes],
      }));
    }
  }, [currentMedicine.frequency]);

  const addMedicine = () => {
    if (!currentMedicine.name.trim()) {
      Alert.alert('Required Field', 'Please enter the medicine name');
      return;
    }

    if (selectedTypeDetails?.needsQuantity && !currentMedicine.totalQuantity) {
      Alert.alert('Required Field', `Please enter the total quantity in ${currentMedicine.unit}s`);
      return;
    }

    if (currentMedicine.customTimes.length === 0) {
      Alert.alert('Required', 'Please add at least one time');
      return;
    }

    const newMedicine = {
      ...currentMedicine,
      name: currentMedicine.name.trim(),
      times: currentMedicine.customTimes,
      timesPerDay: currentMedicine.customTimes.length,
      id: Date.now().toString(),
      needsQuantity: selectedTypeDetails?.needsQuantity,
    };

    setMedicines([...medicines, newMedicine]);

    // Reset form
    setCurrentMedicine({
      name: '',
      type: 'tablet',
      unit: 'tablet',
      dose: '1',
      totalQuantity: '',
      frequency: 'twice_daily',
      customTimes: ['08:00 AM', '08:00 PM'],
      foodInstruction: 'after_food',
      durationDays: '0',
      remainingDoses: 0,
      instructions: '',
    });

    Alert.alert('✓ Added', `${newMedicine.name} has been added`);
  };

  const removeMedicine = id => {
    Alert.alert('Remove Medicine', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Remove', style: 'destructive', onPress: () => setMedicines(medicines.filter(m => m.id !== id))},
    ]);
  };

  const selectType = type => {
    setCurrentMedicine({
      ...currentMedicine,
      type: type.value,
      unit: type.unit,
      totalQuantity: type.needsQuantity ? currentMedicine.totalQuantity : '',
    });
    setShowTypeModal(false);
  };

  const selectFrequency = freq => {
    setCurrentMedicine({...currentMedicine, frequency: freq.value});
    setShowFrequencyModal(false);
  };

  const openTimeEditor = (index) => {
    setEditingTimeIndex(index);
    setSelectedPresetTime(currentMedicine.customTimes[index]);
    setShowTimePickerModal(true);
  };

  const addNewTime = () => {
    setEditingTimeIndex(null);
    setSelectedPresetTime('08:00 AM');
    setShowTimePickerModal(true);
  };

  const saveTime = () => {
    const newTimes = [...currentMedicine.customTimes];
    if (editingTimeIndex !== null) {
      newTimes[editingTimeIndex] = selectedPresetTime;
    } else {
      newTimes.push(selectedPresetTime);
    }
    
    // Sort times chronologically
    newTimes.sort((a, b) => convertTimeToMinutes(a) - convertTimeToMinutes(b));

    setCurrentMedicine({...currentMedicine, customTimes: newTimes});
    setShowTimePickerModal(false);
  };

  const removeTime = (index) => {
    if (currentMedicine.customTimes.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one time is required');
      return;
    }
    const newTimes = currentMedicine.customTimes.filter((_, i) => i !== index);
    setCurrentMedicine({...currentMedicine, customTimes: newTimes});
  };

  const convertTimeToMinutes = (time) => {
    const [timePart, period] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const handleFinish = async () => {
    if (medicines.length === 0) {
      Alert.alert('No Medicines', 'Please add at least one medicine to continue');
      return;
    }

    setIsSaving(true);

    try {
      const savedMedicines = [];
      for (const med of medicines) {
        const saved = await MedicineDB.create({
          prescriptionId,
          name: med.name,
          type: med.type,
          dose: med.dose,
          unit: med.unit,
          frequency: med.frequency,
          times: med.times,
          foodInstruction: med.foodInstruction,
          durationDays: parseInt(med.durationDays) || 0,
          totalQuantity: med.totalQuantity ? parseFloat(med.totalQuantity) : null,
          instructions: med.instructions,
        });
        savedMedicines.push(saved);
      }

      navigation.replace('ReviewPrescription', {prescriptionId, prescriptionName});
    } catch (error) {
      console.error('[AddMedicines] Error:', error);
      Alert.alert('Error', 'Failed to save medicines. Please try again.');
      setIsSaving(false);
    }
  };

  const getDurationDisplay = () => {
    if (!selectedTypeDetails?.needsQuantity) {
      return {
        main: 'As Directed',
        sub: 'Apply when needed',
        icon: '👌',
      };
    }

    const days = parseInt(currentMedicine.durationDays) || 0;
    const remaining = currentMedicine.remainingDoses || 0;

    if (days === 0 && remaining === 0) {
      return null;
    }

    let mainText = `${days} day${days !== 1 ? 's' : ''}`;
    let subText = '';
    let icon = '📅';

    if (remaining > 0) {
      const extraDoses = remaining;
      mainText += ` + ${extraDoses} dose${extraDoses !== 1 ? 's' : ''}`;
      subText = `Medicine will last ${days} full days, then ${extraDoses} more dose${extraDoses !== 1 ? 's' : ''}`;
      icon = '⚠️';
    } else {
      subText = `Medicine will last exactly ${days} day${days !== 1 ? 's' : ''}`;
      icon = '✓';
    }

    return {main: mainText, sub: subText, icon};
  };

  const selectedFreq = FREQUENCIES.find(f => f.value === currentMedicine.frequency);
  const durationInfo = getDurationDisplay();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowBackIcon size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Add Medicines</Text>
            <Text style={styles.headerSubtitle}>{prescriptionName}</Text>
          </View>
        </View>

        {/* Added Medicines List */}
        {medicines.length > 0 && (
          <View style={styles.medicinesListContainer}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Added Medicines</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{medicines.length}</Text>
              </View>
            </View>
            
            {medicines.map((med) => {
              const medType = MEDICINE_TYPES.find(t => t.value === med.type);
              const MedIcon = medType?.Icon || PillIcon;
              
              return (
                <View key={med.id} style={styles.medicineListItem}>
                  <View style={[styles.medicineIconContainer, {backgroundColor: medType?.color + '20'}]}>
                    {MedIcon && React.createElement(MedIcon, {size: 24, color: medType?.color || colors.primary})}
                  </View>
                  
                  <View style={styles.medicineContent}>
                    <Text style={styles.medicineName}>{med.name}</Text>
                    <View style={styles.medicineMetaRow}>
                      <Text style={styles.metaText}>{med.times.length}x daily</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>{med.times.join(', ')}</Text>
                    </View>
                    {med.needsQuantity && (
                      <View style={styles.quantityRow}>
                        <BoxMultipleIcon size={14} color={colors.primary} />
                        <Text style={styles.quantityText}>
                          {med.totalQuantity} {med.unit}s • {med.durationDays}d
                          {med.remainingDoses > 0 && ` +${med.remainingDoses}`}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => removeMedicine(med.id)}
                    style={styles.removeButton}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <TrashIcon size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Add Medicine Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {medicines.length === 0 ? 'Add Your First Medicine' : 'Add Another Medicine'}
          </Text>

          {/* Medicine Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Medicine Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Paracetamol, Amoxicillin"
              placeholderTextColor={colors.textMuted}
              value={currentMedicine.name}
              onChangeText={handleNameChange}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {isSearching && (
                  <Text style={styles.searchingText}>Searching...</Text>
                )}
                {suggestions.slice(0, 8).map((item, index) => {
                  const displayName = typeof item === 'string'
                    ? item
                    : (item.name || item.medicineName || item.brandName || JSON.stringify(item));
                  const subText = typeof item === 'object'
                    ? (item.genericName || item.category || item.type || '')
                    : '';
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionItem,
                        index < suggestions.slice(0, 8).length - 1 && styles.suggestionItemBorder,
                      ]}
                      onPress={() => selectSuggestion(item)}
                      activeOpacity={0.7}>
                      <PillIcon size={16} color={colors.primary} />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionName}>{displayName}</Text>
                        {subText ? <Text style={styles.suggestionSub}>{subText}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {isSearching && !showSuggestions && currentMedicine.name.trim().length >= 3 && (
              <Text style={styles.searchingHint}>Searching medicines...</Text>
            )}
          </View>

          {/* Type Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Medicine Type</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowTypeModal(true)}>
              <View style={[styles.selectIconContainer, {backgroundColor: selectedTypeDetails?.color + '20'}]}>
                {selectedTypeDetails?.Icon && React.createElement(selectedTypeDetails.Icon, {size: 20, color: selectedTypeDetails.color})}
              </View>
              <Text style={styles.selectButtonText}>{selectedTypeDetails?.label}</Text>
              <ChevronRightIcon size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Dosage & Quantity Row (conditional for cream) */}
          {selectedTypeDetails?.needsQuantity ? (
            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <Text style={styles.inputLabel}>Dose per Time</Text>
                <View style={styles.unitInputContainer}>
                  <TextInput
                    style={styles.unitInput}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    value={currentMedicine.dose}
                    onChangeText={text => setCurrentMedicine({...currentMedicine, dose: text})}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.unitLabel}>
                    <Text style={styles.unitLabelText}>{currentMedicine.unit}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.column}>
                <Text style={styles.inputLabel}>
                  Total Quantity <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.unitInputContainer}>
                  <TextInput
                    style={styles.unitInput}
                    placeholder="30"
                    placeholderTextColor={colors.textMuted}
                    value={currentMedicine.totalQuantity}
                    onChangeText={text => setCurrentMedicine({...currentMedicine, totalQuantity: text})}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.unitLabel}>
                    <Text style={styles.unitLabelText}>{currentMedicine.unit}s</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.creamNotice}>
              <BandageIcon size={20} color={colors.primary} />
              <Text style={styles.creamNoticeText}>
                For creams/ointments, just set when to apply. No quantity tracking needed.
              </Text>
            </View>
          )}

          {/* Frequency Selector */}
          <View style={styles.inputGroup}>
            <View style={styles.labelWithIcon}>
              <ClockIcon size={16} color={colors.primary} />
              <Text style={styles.inputLabel}>How Often?</Text>
            </View>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowFrequencyModal(true)}>
              <View style={styles.frequencyBadge}>
                <Text style={styles.frequencyBadgeText}>{selectedFreq?.short}</Text>
              </View>
              <Text style={styles.selectButtonText}>{selectedFreq?.label}</Text>
              <ChevronRightIcon size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Times Editor */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Times (Tap to edit)</Text>
            <View style={styles.timesContainer}>
              {currentMedicine.customTimes.map((time, index) => (
                <View key={index} style={styles.timeChip}>
                  <ClockIcon size={16} color={colors.primary} />
                  <Text style={styles.timeChipText}>{time}</Text>
                  <TouchableOpacity
                    onPress={() => openTimeEditor(index)}
                    style={styles.timeChipButton}
                    hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                    <EditIcon size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeTime(index)}
                    style={styles.timeChipButton}
                    hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                    <XIcon size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addTimeButton} onPress={addNewTime}>
                <PlusIcon size={18} color={colors.primary} />
                <Text style={styles.addTimeButtonText}>Add Time</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Food Instruction */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>When to Take?</Text>
            <View style={styles.optionsGrid}>
              {FOOD_INSTRUCTIONS.map(food => {
                const FoodIcon = food.Icon;
                const isSelected = currentMedicine.foodInstruction === food.value;
                
                return (
                  <TouchableOpacity
                    key={food.value}
                    style={[
                      styles.optionChip,
                      isSelected && [styles.optionChipSelected, {borderColor: food.color}]
                    ]}
                    onPress={() => setCurrentMedicine({...currentMedicine, foodInstruction: food.value})}>
                    {FoodIcon && React.createElement(FoodIcon, {size: 16, color: isSelected ? food.color : colors.textMuted})}
                    <Text style={[styles.optionChipText, isSelected && {color: food.color, fontWeight: '600'}]}>
                      {food.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Auto-calculated Duration */}
          {durationInfo && (
            <View style={styles.calculationContainer}>
              <View style={styles.calculationIconContainer}>
                <CalendarIcon size={20} color={colors.primary} />
              </View>
              <View style={styles.calculationContent}>
                <Text style={styles.calculationLabel}>Calculated Duration</Text>
                <Text style={styles.calculationValue}>
                  {durationInfo.icon} {durationInfo.main}
                </Text>
                {durationInfo.sub && <Text style={styles.calculationDetail}>{durationInfo.sub}</Text>}
              </View>
            </View>
          )}

          {/* Add Button */}
          <TouchableOpacity style={styles.addButton} onPress={addMedicine} activeOpacity={0.7}>
            <PlusIcon size={20} color={colors.white} />
            <Text style={styles.addButtonText}>Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        {medicines.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.continueButton, isSaving && styles.continueButtonDisabled]}
              onPress={handleFinish}
              disabled={isSaving}
              activeOpacity={0.7}>
              <CheckIcon size={22} color={colors.white} />
              <Text style={styles.continueButtonText}>
                {isSaving ? 'Saving...' : `Continue with ${medicines.length} Medicine${medicines.length > 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>

            <View style={styles.helpContainer}>
              <InfoIcon size={16} color={colors.primary} />
              <Text style={styles.helpText}>
                You can add more medicines or continue to review
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Type Selection Modal */}
      <Modal visible={showTypeModal} animationType="slide" transparent={true} onRequestClose={() => setShowTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowTypeModal(false)} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Medicine Type</Text>
            
            <ScrollView style={styles.modalScroll}>
              {MEDICINE_TYPES.map(type => {
                const TypeIcon = type.Icon;
                const isSelected = currentMedicine.type === type.value;
                
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.modalOption, isSelected && [styles.modalOptionSelected, {borderColor: type.color}]]}
                    onPress={() => selectType(type)}>
                    <View style={[styles.modalOptionIcon, {backgroundColor: type.color + '20'}]}>
                      {TypeIcon && React.createElement(TypeIcon, {size: 24, color: type.color})}
                    </View>
                    <View style={styles.modalOptionContent}>
                      <Text style={styles.modalOptionText}>{type.label}</Text>
                      {!type.needsQuantity && (
                        <Text style={styles.modalOptionSub}>No quantity tracking</Text>
                      )}
                    </View>
                    {isSelected && <CheckIcon size={22} color={type.color} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowTypeModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Frequency Selection Modal */}
      <Modal visible={showFrequencyModal} animationType="slide" transparent={true} onRequestClose={() => setShowFrequencyModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowFrequencyModal(false)} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>How Often Per Day?</Text>
            
            <ScrollView style={styles.modalScroll}>
              {FREQUENCIES.map(freq => {
                const isSelected = currentMedicine.frequency === freq.value;
                
                return (
                  <TouchableOpacity
                    key={freq.value}
                    style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                    onPress={() => selectFrequency(freq)}>
                    <View style={styles.freqBadgeContainer}>
                      <Text style={styles.freqBadgeText}>{freq.short}</Text>
                    </View>
                    <View style={styles.freqContent}>
                      <Text style={styles.modalOptionText}>{freq.label}</Text>
                      {freq.defaultTimes.length > 0 && (
                        <Text style={styles.freqTimesText}>{freq.defaultTimes.join(', ')}</Text>
                      )}
                    </View>
                    {isSelected && <CheckIcon size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowFrequencyModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePickerModal} animationType="slide" transparent={true} onRequestClose={() => setShowTimePickerModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowTimePickerModal(false)} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingTimeIndex !== null ? 'Edit Time' : 'Add Time'}
            </Text>
            
            <ScrollView style={styles.modalScroll}>
              {TIME_PRESETS.map(time => {
                const isSelected = selectedPresetTime === time;
                
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                    onPress={() => setSelectedPresetTime(time)}>
                    <ClockIcon size={20} color={isSelected ? colors.primary : colors.textMuted} />
                    <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
                      {time}
                    </Text>
                    {isSelected && <CheckIcon size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <TouchableOpacity style={styles.modalSaveButton} onPress={saveTime}>
              <CheckIcon size={20} color={colors.white} />
              <Text style={styles.modalSaveText}>Save Time</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowTimePickerModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg},
  backButton: {padding: 4},
  headerTextContainer: {flex: 1},
  headerTitle: {fontSize: 20, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5},
  headerSubtitle: {fontSize: 14, color: colors.primary, marginTop: 2, fontWeight: '600'},

  medicinesListContainer: {marginBottom: spacing.lg},
  listHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md},
  listTitle: {fontSize: 16, fontWeight: '700', color: colors.textPrimary},
  countBadge: {backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, minWidth: 28, alignItems: 'center'},
  countBadgeText: {fontSize: 13, fontWeight: '800', color: colors.white},

  medicineListItem: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.sm, ...shadows.md},
  medicineIconContainer: {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  medicineContent: {flex: 1},
  medicineName: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 6},
  medicineMetaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4, flexWrap: 'wrap'},
  metaText: {fontSize: 11, color: colors.textMuted, fontWeight: '500'},
  metaDot: {width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border},
  quantityRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  quantityText: {fontSize: 12, color: colors.primary, fontWeight: '600'},
  removeButton: {padding: 8},

  formContainer: {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadows.lg, marginBottom: spacing.lg},
  formTitle: {fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg},

  inputGroup: {marginBottom: spacing.lg},
  inputLabel: {fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm},
  requiredStar: {color: colors.error},
  labelWithIcon: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm},

  textInput: {backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing.base, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 15, color: colors.textPrimary, fontWeight: '500'},

  selectButton: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, padding: spacing.base},
  selectIconContainer: {width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  selectButtonText: {flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary},

  twoColumnRow: {flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg},
  column: {flex: 1},

  unitInputContainer: {flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, overflow: 'hidden'},
  unitInput: {flex: 1, paddingHorizontal: spacing.base, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 15, color: colors.textPrimary, fontWeight: '600'},
  unitLabel: {backgroundColor: colors.border + '60', paddingHorizontal: spacing.md, justifyContent: 'center', minWidth: 60},
  unitLabelText: {fontSize: 13, fontWeight: '600', color: colors.textMuted, textAlign: 'center'},

  creamNotice: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.lg},
  creamNoticeText: {flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18, fontWeight: '500'},

  frequencyBadge: {backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6, minWidth: 60, alignItems: 'center'},
  frequencyBadgeText: {fontSize: 14, fontWeight: '800', color: colors.white},

  timesContainer: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  timeChip: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingLeft: spacing.md, paddingRight: spacing.xs, paddingVertical: spacing.xs, borderWidth: 1.5, borderColor: colors.primary + '40'},
  timeChipText: {fontSize: 13, fontWeight: '600', color: colors.primary},
  timeChipButton: {padding: 4},
  addTimeButton: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.background, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed'},
  addTimeButtonText: {fontSize: 13, fontWeight: '600', color: colors.primary},

  optionsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  optionChip: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border},
  optionChipSelected: {backgroundColor: colors.background},
  optionChipText: {fontSize: 13, fontWeight: '500', color: colors.textSecondary},

  calculationContainer: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.lg},
  calculationIconContainer: {width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center'},
  calculationContent: {flex: 1},
  calculationLabel: {fontSize: 12, color: colors.textMuted, marginBottom: 4, fontWeight: '500'},
  calculationValue: {fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 4},
  calculationDetail: {fontSize: 12, fontWeight: '500', color: colors.textSecondary, lineHeight: 16},

  addButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.textSecondary, borderRadius: radius.md, paddingVertical: 14, ...shadows.sm},
  addButtonText: {fontSize: 15, fontWeight: '700', color: colors.white, letterSpacing: 0.3},

  continueButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, ...shadows.lg},
  continueButtonDisabled: {opacity: 0.5},
  continueButtonText: {fontSize: 16, fontWeight: '700', color: colors.white, letterSpacing: 0.3},

  helpContainer: {flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.base, marginTop: spacing.md, alignItems: 'center'},
  helpText: {flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18, fontWeight: '500'},

  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalBackdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)'},
  modalContainer: {backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, maxHeight: '75%'},
  modalHandle: {width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg},
  modalTitle: {fontSize: 19, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center'},
  modalScroll: {maxHeight: 400},
  modalOption: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.sm, borderWidth: 2, borderColor: 'transparent'},
  modalOptionSelected: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  modalOptionIcon: {width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  modalOptionContent: {flex: 1},
  modalOptionText: {fontSize: 15, fontWeight: '600', color: colors.textPrimary},
  modalOptionSub: {fontSize: 12, color: colors.textMuted, marginTop: 2},
  modalCloseButton: {marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md},
  modalCloseText: {fontSize: 16, fontWeight: '600', color: colors.textMuted},

  freqBadgeContainer: {backgroundColor: colors.primary, borderRadius: radius.xs, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60, alignItems: 'center'},
  freqBadgeText: {fontSize: 15, fontWeight: '800', color: colors.white},
  freqContent: {flex: 1},
  freqTimesText: {fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '500'},

  timeOption: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.xs, borderWidth: 2, borderColor: 'transparent'},
  timeOptionSelected: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  timeOptionText: {flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary},
  timeOptionTextSelected: {color: colors.primary},

  modalSaveButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, marginTop: spacing.lg, ...shadows.md},
  modalSaveText: {fontSize: 16, fontWeight: '700', color: colors.white},

  // Medicine name search suggestions
  suggestionsContainer: {marginTop: 4, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, borderColor: colors.primary + '50', overflow: 'hidden', ...shadows.md},
  suggestionItem: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: 12},
  suggestionItemBorder: {borderBottomWidth: 1, borderBottomColor: colors.border},
  suggestionTextContainer: {flex: 1},
  suggestionName: {fontSize: 14, fontWeight: '600', color: colors.textPrimary},
  suggestionSub: {fontSize: 12, color: colors.textMuted, marginTop: 2},
  searchingText: {fontSize: 13, color: colors.textMuted, padding: spacing.sm, textAlign: 'center'},
  searchingHint: {fontSize: 12, color: colors.primary, marginTop: 6, paddingLeft: 4, fontWeight: '500'},
});
