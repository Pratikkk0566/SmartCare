import React, {useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {StorageService} from '../../services/StorageService';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon} from '../../assets/icons/Icons';

const getPatientId = patient => String(
  patient?.id || patient?.patientId || patient?.patient_id ||
  patient?.clientId || patient?.clientid || '',
);

const getPatientName = patient => {
  const name = [
    patient?.firstname,
    patient?.firstName,
    patient?.middlename,
    patient?.middleName,
    patient?.surname,
    patient?.lastName,
  ].filter(Boolean).join(' ').trim();

  return name || patient?.name || 'Patient';
};

const getPatientDetails = patient => [
  patient?.uhid || patient?.UHID || patient?.accountNo || patient?.accountNumber,
  patient?.gender,
  patient?.dateOfBirth || patient?.dob,
].filter(Boolean).join('  •  ') || 'Patient record';

export default function PatientSelectionScreen({navigation, route}) {
  const {patients = [], mode, userData} = route.params || {};
  const {setIsLoggedIn, setIsOnboarded, updateProfile, selectPatient} = useApp();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const patient = patients.find(item => getPatientId(item) === selectedPatientId);
    if (!patient || loading) return;

    setLoading(true);
    setError('');
    try {
      await selectPatient(patient);

      if (mode === 'register' && userData) {
        await StorageService.set('@isOnboarded', 'true');
        await StorageService.set('@isLoggedIn', true);
        await updateProfile({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: route.params?.phone || '',
          bloodGroup: userData.bloodGroup || '',
        });
        setIsOnboarded(true);
        setIsLoggedIn(true);
        navigation.replace('AccountCreated', {userData});
      } else {
        await StorageService.set('@isLoggedIn', true);
        setIsLoggedIn(true);
        navigation.reset({index: 0, routes: [{name: 'MainTabs'}]});
      }
    } catch (selectionError) {
      console.error('[PATIENT SELECTION] Failed to save selected patient:', selectionError);
      setError('Unable to save this patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <TouchableOpacity
        style={styles.back}
        onPress={() => navigation.goBack()}
        hitSlop={8}>
        <ArrowBackIcon size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>?</Text>
        </View>
        <Text style={styles.title}>Which patient would you like to log in as?</Text>
        <Text style={styles.subtitle}>
          We found more than one patient record linked to this mobile number.
          Select your record to continue.
        </Text>

        <View style={styles.patientList}>
          {patients.map(patient => {
            const patientId = getPatientId(patient);
            const selected = patientId === selectedPatientId;
            return (
              <TouchableOpacity
                key={patientId}
                style={[styles.patientCard, selected && styles.patientCardSelected]}
                onPress={() => setSelectedPatientId(patientId)}
                activeOpacity={0.8}>
                <View style={[styles.avatar, selected && styles.avatarSelected]}>
                  <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>
                    {getPatientName(patient).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{getPatientName(patient)}</Text>
                  <Text style={styles.patientDetail}>{getPatientDetails(patient)}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.continueButton, (!selectedPatientId || loading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selectedPatientId || loading}
          activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.continueText}>Continue</Text>}
        </TouchableOpacity>
        <Text style={styles.footer}>You can change the patient later from your profile.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  back: {padding: spacing.base, paddingBottom: spacing.sm, alignSelf: 'flex-start'},
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.lg,
  },
  iconText: {fontSize: 32, fontWeight: '800', color: colors.primary},
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  patientList: {gap: spacing.md},
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  patientCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginRight: spacing.md,
  },
  avatarSelected: {backgroundColor: colors.primary},
  avatarText: {fontSize: 20, fontWeight: '800', color: colors.primary},
  avatarTextSelected: {color: colors.white},
  patientInfo: {flex: 1},
  patientName: {fontSize: 16, fontWeight: '700', color: colors.textPrimary},
  patientDetail: {fontSize: 13, color: colors.textSecondary, marginTop: 4},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  radioSelected: {borderColor: colors.primary},
  radioDot: {width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary},
  error: {color: colors.error, fontSize: 13, textAlign: 'center', marginTop: spacing.md},
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonDisabled: {opacity: 0.5},
  continueText: {color: colors.white, fontSize: 16, fontWeight: '700'},
  footer: {color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.md},
});
