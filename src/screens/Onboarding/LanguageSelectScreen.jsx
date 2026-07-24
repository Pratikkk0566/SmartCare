import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {languages} from '../../data/mockData';
import AppIcon from '../../assets/illustrations/AppIcon';
import Button from '../../components/common/Button';
import {ShieldIcon} from '../../assets/icons/Icons';
import {StorageService} from '../../services/StorageService';
import {useApp} from '../../context/AppContext';

export default function LanguageSelectScreen({navigation}) {
  const [selected, setSelected] = useState('en');
  const {setSelectedLanguage} = useApp();

  const handleContinue = async () => {
    await StorageService.set('@selectedLanguage', selected);
    setSelectedLanguage(selected);
    navigation.navigate('PhoneLogin');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppIcon size={80} />
          <Text style={styles.title}>Choose Your Language</Text>
          <Text style={styles.subtitle}>Select the language you would like to use in the app.</Text>
        </View>

        <View style={styles.list}>
          {languages.map(lang => {
            const isSelected = selected === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[styles.langCard, isSelected && styles.langCardSelected]}
                onPress={() => setSelected(lang.id)}
                activeOpacity={0.8}>
                <View style={styles.langIcon}>
                  <Text style={styles.langSymbol}>{lang.symbol}</Text>
                </View>
                <View style={styles.langInfo}>
                  <Text style={styles.langNative}>{lang.nativeName}</Text>
                  <Text style={styles.langEnglish}>{lang.name}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.noteCard}>
          <ShieldIcon size={18} color={colors.primary} />
          <Text style={styles.noteText}>
            You can change the language later{'\n'}
            <Text style={styles.notePath}>Go to Profile {'>'} Settings {'>'} Language</Text>
          </Text>
        </View>

        <Button title="Continue" onPress={handleContinue} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 40},
  header: {alignItems: 'center', paddingVertical: spacing.xl},
  title: {fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.base, textAlign: 'center'},
  subtitle: {fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20},
  list: {gap: spacing.sm, marginBottom: spacing.base},
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
    gap: spacing.md,
  },
  langCardSelected: {borderColor: colors.primary},
  langIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSymbol: {fontSize: 16, fontWeight: '700', color: colors.primary},
  langInfo: {flex: 1},
  langNative: {fontSize: 16, fontWeight: '700', color: colors.textPrimary},
  langEnglish: {fontSize: 13, color: colors.textSecondary, marginTop: 2},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {borderColor: colors.primary},
  radioDot: {width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary},
  noteCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.base,
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  noteText: {flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20},
  notePath: {color: colors.primary, fontWeight: '600'},
  btn: {marginTop: spacing.sm},
});