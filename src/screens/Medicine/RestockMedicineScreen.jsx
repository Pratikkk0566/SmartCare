import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {ArrowBackIcon, HomeDeliveryIcon, PharmacyIcon, InfoIcon, LockIcon, CheckboxIcon, CapsuleIcon, DownloadIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

export default function RestockMedicineScreen({navigation}) {
  const {medicines} = useApp();
  const [checked, setChecked] = useState(() => {
    const init = {};
    medicines.forEach(m => { init[m.id] = m.stock === 'out'; });
    return init;
  });
  const [delivery, setDelivery] = useState('home');
  const [note, setNote] = useState('');

  const toggleCheck = id => setChecked(p => ({...p, [id]: !p[id]}));
  const anyChecked = Object.values(checked).some(Boolean);

  const handleSend = () => {
    if (!anyChecked) return;
    Alert.alert('Request Sent!', 'Your doctor will be notified.', [{text: 'OK', onPress: () => navigation.goBack()}]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restock Medicine</Text>
        </View>
        <Text style={styles.subtitle}>Select the medicines you need to restock. We will notify your doctor and you will be updated on the status.</Text>

        <Text style={styles.sectionTitle}>Select Medicines to Restock</Text>

        {medicines.map(med => (
          <TouchableOpacity key={med.id} style={styles.medRow} onPress={() => toggleCheck(med.id)} activeOpacity={0.8}>
            <View style={[styles.medIcon, {backgroundColor: med.bgColor}]}>
              <CapsuleIcon size={20} color={colors.primary} />
            </View>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medSub}>{med.type} · {med.quantity} left</Text>
              <View style={styles.stockRow}>
                <StatusChip status={med.stock === 'in' ? 'In Stock' : 'Out of Stock'} size="xs" />
                <Text style={styles.needsText}>{med.stock === 'out' ? 'Needs restock' : 'No restock needed'}</Text>
              </View>
            </View>
            <CheckboxIcon size={24} color={colors.primary} checked={checked[med.id]} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Delivery Method</Text>
        <TouchableOpacity style={[styles.deliveryCard, delivery === 'home' && styles.deliveryCardSelected]} onPress={() => setDelivery('home')}>
          <HomeDeliveryIcon size={24} color={delivery === 'home' ? colors.primary : colors.textSecondary} />
          <View style={styles.deliveryInfo}>
            <Text style={[styles.deliveryName, delivery === 'home' && styles.deliveryNameSelected]}>Home Delivery</Text>
            <Text style={styles.deliverySub}>Get your medicines delivered to your home</Text>
          </View>
          <View style={[styles.radio, delivery === 'home' && styles.radioSelected]}>
            {delivery === 'home' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deliveryCard, delivery === 'pickup' && styles.deliveryCardSelected]} onPress={() => setDelivery('pickup')}>
          <PharmacyIcon size={24} color={delivery === 'pickup' ? colors.primary : colors.textSecondary} />
          <View style={styles.deliveryInfo}>
            <Text style={[styles.deliveryName, delivery === 'pickup' && styles.deliveryNameSelected]}>Pick Up from Pharmacy</Text>
            <Text style={styles.deliverySub}>I will collect the medicines from the pharmacy</Text>
          </View>
          <View style={[styles.radio, delivery === 'pickup' && styles.radioSelected]}>
            {delivery === 'pickup' && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <View style={styles.noteBoxHeader}>
            <InfoIcon size={16} color={colors.primary} />
            <Text style={styles.noteBoxTitle}>Important Note</Text>
          </View>
          <Text style={styles.noteBullet}>• Your doctor will review the request and approve if required.</Text>
          <Text style={styles.noteBullet}>• Medicines will be dispatched within 1-2 business days.</Text>
          <Text style={styles.noteBullet}>• You will receive a notification once the request is processed.</Text>
        </View>

        <Text style={styles.sectionTitle}>Add a Note (Optional)</Text>
        <View style={styles.noteInputWrap}>
          <TextInput
            style={styles.noteInput}
            multiline
            maxLength={200}
            placeholder="Add any note for your doctor..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />
          <Text style={styles.charCount}>{note.length}/200</Text>
        </View>

        <LinearGradient colors={anyChecked ? [colors.primary, colors.primaryDark] : ['#C4B5FD', '#A78BFA']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.sendBtn}>
          <TouchableOpacity style={styles.sendBtnInner} onPress={handleSend} disabled={!anyChecked}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
              <DownloadIcon size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Send Request</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.footer}>
          <LockIcon size={14} color={colors.textMuted} />
          <Text style={styles.footerText}>Your health information is secure and private.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm},
  back: {padding: 4},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  subtitle: {fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.base},
  sectionTitle: {fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.sm},
  medRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md},
  medIcon: {width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  medEmoji: {fontSize: 20},
  medInfo: {flex: 1},
  medName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  medSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  stockRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4},
  needsText: {fontSize: 11, color: colors.textMuted},
  deliveryCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md, borderWidth: 1.5, borderColor: 'transparent'},
  deliveryCardSelected: {borderColor: colors.primary},
  deliveryInfo: {flex: 1},
  deliveryName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  deliveryNameSelected: {color: colors.primary},
  deliverySub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  radio: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  radioSelected: {borderColor: colors.primary},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary},
  noteBox: {backgroundColor: '#F0F9FF', borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.base},
  noteBoxHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm},
  noteBoxTitle: {fontSize: 13, fontWeight: '700', color: colors.primary},
  noteBullet: {fontSize: 12, color: colors.textSecondary, lineHeight: 20},
  noteInputWrap: {backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg},
  noteInput: {fontSize: 14, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', padding: 0},
  charCount: {textAlign: 'right', fontSize: 11, color: colors.textMuted, marginTop: 4},
  sendBtn: {borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.base},
  sendBtnInner: {paddingVertical: spacing.base + 2, alignItems: 'center'},
  sendBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  footer: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center'},
  footerText: {fontSize: 12, color: colors.textMuted},
});
