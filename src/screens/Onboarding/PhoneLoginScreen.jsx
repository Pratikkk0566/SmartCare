import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {PhoneIcon, PersonIcon, HospitalBuildingIcon} from '../../assets/icons/Icons';
import {CLINIC_OPTIONS} from '../../API/Api';

const appLogo = require('../../assets/images/ic_launcher_foreground.png');

function AadhaarOptionIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 60 60" fill="none">
      <Path
        d="M30 50 C17 50 8 41 8 30 C8 19 17 10 30 10 C43 10 52 19 52 30"
        stroke="#D97706" strokeWidth={4} strokeLinecap="round" />
      <Path
        d="M30 43 C21 43 15 37 15 30 C15 23 21 17 30 17 C39 17 45 23 45 30"
        stroke="#D97706" strokeWidth={4} strokeLinecap="round" />
      <Path
        d="M30 36 C25.5 36 22 33 22 30 C22 27 25.5 24 30 24 C34.5 24 38 27 38 30"
        stroke="#D97706" strokeWidth={4} strokeLinecap="round" />
      <Circle cx="30" cy="30" r="3.5" fill="#D97706" />
    </Svg>
  );
}

const OPTIONS = [
  {
    key: 'phone',
    label: 'Login with Phone Number',
    sub: 'Login using your mobile number',
    iconStyle: 'primary',
    render: () => <PhoneIcon size={20} color={colors.primary} />,
    route: 'PhoneNumberEntry',
  },
  {
    key: 'aadhaar',
    label: 'Login with Aadhaar',
    sub: 'Login using your Aadhaar number',
    iconStyle: 'warning',
    render: () => <AadhaarOptionIcon />,
    route: 'AadhaarLogin',
  },
  {
    key: 'register',
    label: 'Create Account',
    sub: 'Sign up by creating a new account',
    iconStyle: 'primary',
    render: () => <PersonIcon size={20} color={colors.primary} />,
    route: 'Register',
  },
];

export default function PhoneLoginScreen({navigation}) {
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Restore dynamic clinic choice on mount
  useEffect(() => {
    async function loadClinic() {
      const savedId = await AsyncStorage.getItem('CLINICID');
      if (savedId) {
        const found = CLINIC_OPTIONS.find(o => o.clinicId === savedId);
        if (found) setSelectedClinic(found);
      }
    }
    loadClinic();
  }, []);

  const handleSelectClinic = async (clinic) => {
    setSelectedClinic(clinic);
    setShowDropdown(false);
    await AsyncStorage.setItem('CLINICID', clinic.clinicId);
    await AsyncStorage.setItem('Tenant', clinic.clinicId);
  };

  const handleOptionPress = (opt) => {
    if (!selectedClinic) {
      Alert.alert(
        'Clinic Required',
        'Please select a clinic/hospital from the dropdown before proceeding.',
        [{text: 'OK'}]
      );
      return;
    }
    navigation.navigate(opt.route);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primaryLight} />

      <View style={styles.root}>
        {/* SmartCare Logo */}
        <View style={styles.logoRow}>
          <Image source={appLogo} style={styles.logoImg} />
          <Text style={styles.appName}>SmartCare PHR</Text>
          <Text style={styles.appTagline}>Your Health, Our Priority</Text>
        </View>

        {/* Clinic Dropdown Selector */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>SELECT YOUR CLINIC / HOSPITAL</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.7}>
            <View style={styles.dropdownTriggerLeft}>
              <HospitalBuildingIcon size={18} color={selectedClinic ? colors.primary : colors.textMuted} />
              <Text style={[styles.dropdownTriggerText, !selectedClinic && styles.placeholder]}>
                {selectedClinic ? selectedClinic.displayName : 'Choose clinic...'}
              </Text>
            </View>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Option Cards */}
        <View style={styles.options}>
          {OPTIONS.map(opt => {
            const iconCircleStyle = opt.iconStyle === 'warning' ? styles.iconCircleWarning : styles.iconCirclePrimary;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.card, !selectedClinic && styles.cardDisabled]}
                onPress={() => handleOptionPress(opt)}
                activeOpacity={0.75}>
                <View style={iconCircleStyle}>
                  {opt.render()}
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{opt.label}</Text>
                  <Text style={styles.cardSub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          {'By continuing, you agree to our\n'}
          <Text style={styles.termsLink}>Terms & Conditions</Text>
          {'  and  '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>

      {/* Premium Picker Modal */}
      <Modal visible={showDropdown} transparent animationType="fade" onRequestClose={() => setShowDropdown(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Select Clinic / Hospital</Text>
            <FlatList
              data={CLINIC_OPTIONS}
              keyExtractor={item => item.clinicId}
              renderItem={({item}) => {
                const isActive = selectedClinic?.clinicId === item.clinicId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      isActive && styles.optionItemActive,
                    ]}
                    onPress={() => handleSelectClinic(item)}>
                    <Text style={[
                      styles.optionText,
                      isActive && styles.optionTextActive,
                    ]}>
                      {item.displayName}
                    </Text>
                    {isActive && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },

  // Logo
  logoRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImg: {width: 200, height: 200, marginBottom: -15},
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  appTagline: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Clinic Dropdown styling
  dropdownContainer: {
    width: '100%',
    marginBottom: 24,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#B2F5EA',
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    ...shadows.sm,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownTriggerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Options
  options: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardDisabled: {
    opacity: 0.85,
  },
  iconCirclePrimary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  iconCircleWarning: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
  },
  cardText: {flex: 1},
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },

  // Terms
  terms: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 'auto',
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Modal Dropdown styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    ...shadows.lg,
    maxHeight: '60%',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  optionItemActive: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.sm,
  },
  optionText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: colors.success,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 15,
    color: colors.success,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
});