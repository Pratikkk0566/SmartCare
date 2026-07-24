import React from 'react';
import {View, TextInput, StyleSheet, TouchableOpacity} from 'react-native';
import {SearchIcon, FilterIcon} from '../../assets/icons/Icons';
import {colors} from '../../theme/colors';
import {radius} from '../../theme/radius';
import {spacing} from '../../theme/spacing';

export default function SearchBar({value, onChangeText, placeholder, onFilterPress, style}) {
  return (
    <View style={[styles.container, style]}>
      <SearchIcon size={18} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Search...'}
        placeholderTextColor={colors.textMuted}
      />
      {onFilterPress && (
        <TouchableOpacity onPress={onFilterPress} style={styles.filter}>
          <FilterIcon size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  filter: {
    padding: 2,
  },
});
