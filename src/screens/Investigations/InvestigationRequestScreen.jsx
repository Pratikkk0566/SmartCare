import React, {useState, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {testCategories, availableTests} from '../../data/mockData';
import {ArrowBackIcon, SearchIcon, ArrowRightIcon, FlaskIcon} from '../../assets/icons/Icons';

function StepBar({current}) {
  const steps = ['Select Test', 'Hospital', 'Date & Time', 'Confirmed'];
  return (
    <View style={sb.row}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={n}>
            <View style={sb.stepWrap}>
              <View style={[sb.circle, active && sb.circleActive, done && sb.circleDone]}>
                <Text style={[sb.num, (active || done) && sb.numActive]}>{done ? '✓' : n}</Text>
              </View>
              <Text style={[sb.label, active && sb.labelActive]} numberOfLines={1}>{label}</Text>
            </View>
            {i < steps.length - 1 && <View style={[sb.line, done && sb.lineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border},
  stepWrap: {alignItems: 'center', width: 56},
  circle: {width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: 3},
  circleActive: {borderColor: colors.primary, backgroundColor: colors.primary},
  circleDone: {borderColor: colors.success, backgroundColor: colors.success},
  num: {fontSize: 10, fontWeight: '800', color: colors.textMuted},
  numActive: {color: '#fff'},
  label: {fontSize: 9, color: colors.textMuted, fontWeight: '500', textAlign: 'center'},
  labelActive: {color: colors.primary, fontWeight: '700'},
  line: {flex: 1, height: 2, backgroundColor: colors.border, marginTop: 11},
  lineDone: {backgroundColor: colors.success},
});

export default function InvestigationRequestScreen({navigation}) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filtered = useMemo(() => {
    let list = availableTests;
    if (selectedCategory) {
      list = list.filter(t => t.category === selectedCategory);
    }
    if (query.trim()) {
      list = list.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
    }
    return list;
  }, [query, selectedCategory]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StepBar current={1} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select a Test</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchIcon size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tests, packages..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Categories */}
        <Text style={styles.sectionLabel}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          <TouchableOpacity
            style={[styles.catChip, !selectedCategory && styles.catChipSelected]}
            onPress={() => setSelectedCategory(null)}>
            <Text style={[styles.catChipText, !selectedCategory && styles.catChipTextSelected]}>All</Text>
          </TouchableOpacity>
          {testCategories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catCard, selectedCategory === c.name.replace('\n', ' ') && styles.catCardSelected, {borderColor: c.color + '60'}]}
              onPress={() => setSelectedCategory(prev => (prev === c.name.replace('\n', ' ') ? null : c.name.replace('\n', ' ')))}>
              <View style={[styles.catEmojiBg, {backgroundColor: c.bg}]}>
                <Text style={styles.catEmoji}>{c.emoji}</Text>
              </View>
              <Text style={[styles.catName, {color: c.color}]} numberOfLines={2}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tests List */}
        <Text style={styles.sectionLabel}>
          {selectedCategory ? selectedCategory : 'All Tests'}{' '}
          <Text style={styles.countLabel}>({filtered.length})</Text>
        </Text>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <FlaskIcon size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No tests found</Text>
          </View>
        ) : (
          filtered.map(test => (
            <TouchableOpacity
              key={test.id}
              style={styles.testCard}
              onPress={() => navigation.navigate('SelectHospital', {test})}
              activeOpacity={0.85}>
              <View style={[styles.testEmojiBg, {backgroundColor: test.bg}]}>
                <Text style={styles.testEmoji}>{test.emoji}</Text>
              </View>
              <View style={styles.testInfo}>
                <Text style={styles.testName}>{test.name}</Text>
                <Text style={styles.testMeta}>🧫 Sample: {test.sampleType}</Text>
                <Text style={styles.testMeta}>📋 {test.preparation}</Text>
                <Text style={styles.testMeta}>📄 Report: {test.reportTime}</Text>
              </View>
              <View style={styles.testRight}>
                <Text style={styles.testPrice}>₹{test.price}</Text>
                <View style={styles.bookTestBtn}>
                  <ArrowRightIcon size={16} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm, backgroundColor: colors.surface},
  back: {padding: 4},
  headerTitle: {fontSize: 17, fontWeight: '700', color: colors.textPrimary},
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
  },
  searchInput: {flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0},
  clearBtn: {fontSize: 14, color: colors.textMuted, paddingHorizontal: 4},
  scroll: {padding: spacing.base, paddingBottom: 32},
  sectionLabel: {fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.sm},
  countLabel: {fontWeight: '400', color: colors.textMuted},
  catRow: {gap: spacing.sm, paddingBottom: spacing.md},
  catChip: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center'},
  catChipSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  catChipText: {fontSize: 12, color: colors.textSecondary, fontWeight: '600'},
  catChipTextSelected: {color: '#fff'},
  catCard: {
    alignItems: 'center', width: 72, borderRadius: radius.md,
    backgroundColor: colors.surface, padding: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border, ...shadows.sm,
  },
  catCardSelected: {borderColor: colors.primary},
  catEmojiBg: {width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 4},
  catEmoji: {fontSize: 20},
  catName: {fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 13},
  testCard: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md,
    ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md,
    alignItems: 'flex-start',
  },
  testEmojiBg: {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  testEmoji: {fontSize: 26},
  testInfo: {flex: 1},
  testName: {fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4},
  testMeta: {fontSize: 11, color: colors.textSecondary, marginBottom: 2},
  testRight: {alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 48},
  testPrice: {fontSize: 16, fontWeight: '800', color: colors.primary},
  bookTestBtn: {padding: 4},
  empty: {alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md},
  emptyText: {fontSize: 14, color: colors.textMuted},
});