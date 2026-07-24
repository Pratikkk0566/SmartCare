import React, {useState} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Platform, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {
  ArrowBackIcon, PersonIcon, MailIcon, PhoneIcon,
  CalendarIcon, LockIcon, HeartIcon,
} from '../../assets/icons/Icons';

function SectionLabel({title}) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function Field({label, icon: Icon, value, onChangeText, placeholder, keyboardType, editable = true, rightElement}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, !editable && styles.inputRowDisabled]}>
        {Icon && <Icon size={17} color={editable ? colors.textMuted : colors.border} />}
        <TextInput
          style={[styles.input, !editable && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType || 'default'}
          autoCapitalize="none"
          editable={editable}
        />
        {rightElement}
      </View>
    </View>
  );
}

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];
const GENDERS = ['Male', 'Female', 'Prefer not to say'];

export default function PersonalInformationScreen({navigation}) {
  const {userProfile, updateProfile} = useApp();

  const [form, setForm] = useState({
    firstName:  userProfile.firstName  || '',
    lastName:   userProfile.lastName   || '',
    email:      userProfile.email      || '',
    phone:      userProfile.phone      || '',
    dob:        userProfile.dob        || '',
    gender:     userProfile.gender     || '',
    bloodGroup: userProfile.bloodGroup || '',
    height:     String(userProfile.height || ''),
    weight:     String(userProfile.weight || ''),
  });

  const set = k => v => setForm(p => ({...p, [k]: v}));

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Required', 'First and last name are required.');
      return;
    }
    await updateProfile({
      firstName:  form.firstName.trim(),
      lastName:   form.lastName.trim(),
      email:      form.email.trim(),
      phone:      form.phone.trim(),
      dob:        form.dob.trim(),
      gender:     form.gender,
      bloodGroup: form.bloodGroup,
      height:     form.height,
      weight:     form.weight,
    });
    Alert.alert('Saved', 'Your personal information has been updated.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(form.firstName[0] || '?').toUpperCase()}
              {(form.lastName[0] || '').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.avatarName}>{form.firstName} {form.lastName}</Text>
          <Text style={styles.avatarSub}>Edit your personal details below</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.card}>
          <SectionLabel title="Basic Information" />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label="First Name"
                icon={PersonIcon}
                value={form.firstName}
                onChangeText={set('firstName')}
                placeholder="John"
              />
            </View>
            <View style={styles.half}>
              <Field
                label="Last Name"
                icon={PersonIcon}
                value={form.lastName}
                onChangeText={set('lastName')}
                placeholder="Doe"
              />
            </View>
          </View>
          <Field label="Date of Birth" icon={CalendarIcon} value={form.dob} onChangeText={set('dob')} placeholder="MM/DD/YYYY" />

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, form.gender === g && styles.chipSelected]}
                onPress={() => set('gender')(g)}>
                <Text style={[styles.chipText, form.gender === g && styles.chipTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <SectionLabel title="Contact Details" />
          <Field label="Email Address" icon={MailIcon} value={form.email} onChangeText={set('email')} placeholder="john@email.com" keyboardType="email-address" />
          <Field label="Phone Number" icon={PhoneIcon} value={form.phone} onChangeText={set('phone')} placeholder="+1 987 654 3210" keyboardType="phone-pad" />
        </View>

        {/* Health */}
        <View style={styles.card}>
          <SectionLabel title="Health Information" />
          <Text style={styles.fieldLabel}>Blood Group</Text>
          <View style={styles.chipRow}>
            {BLOOD_GROUPS.map(bg => (
              <TouchableOpacity
                key={bg}
                style={[styles.chip, form.bloodGroup === bg && styles.chipSelected]}
                onPress={() => set('bloodGroup')(bg)}>
                <Text style={[styles.chipText, form.bloodGroup === bg && styles.chipTextSelected]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Height (cm)" icon={LockIcon} value={form.height} onChangeText={set('height')} placeholder="175" keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Field label="Weight (kg)" icon={HeartIcon} value={form.weight} onChangeText={set('weight')} placeholder="72" keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity style={styles.saveBlock} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBlockText}>Save Changes</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.base,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  backBtn: {padding: 4, marginRight: spacing.sm},
  headerTitle: {flex: 1, fontSize: 17, fontWeight: '700', color: colors.textPrimary},
  saveBtn: {paddingVertical: 6, paddingHorizontal: spacing.md, backgroundColor: colors.primary, borderRadius: radius.full},
  saveBtnText: {fontSize: 13, fontWeight: '700', color: '#fff'},
  scroll: {padding: spacing.base, paddingBottom: 40},
  avatarSection: {alignItems: 'center', paddingVertical: spacing.xl},
  avatar: {width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md},
  avatarText: {fontSize: 28, fontWeight: '700', color: colors.primary},
  avatarName: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  avatarSub: {fontSize: 13, color: colors.textSecondary, marginTop: 4},
  card: {backgroundColor: colors.surface, borderRadius: radius.base, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm},
  sectionLabel: {fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.md},
  row: {flexDirection: 'row', gap: spacing.sm},
  half: {flex: 1},
  fieldWrap: {marginBottom: spacing.md},
  fieldLabel: {fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.xs,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  inputRowDisabled: {backgroundColor: colors.background},
  input: {flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0},
  inputDisabled: {color: colors.textMuted},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md},
  chip: {paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface},
  chipSelected: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  chipText: {fontSize: 13, color: colors.textSecondary, fontWeight: '500'},
  chipTextSelected: {color: colors.primary, fontWeight: '700'},
  saveBlock: {backgroundColor: colors.primary, borderRadius: radius.base, paddingVertical: spacing.base + 2, alignItems: 'center', marginTop: spacing.sm, ...shadows.md},
  saveBlockText: {fontSize: 15, fontWeight: '700', color: '#fff'},
});