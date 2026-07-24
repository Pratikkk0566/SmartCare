import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../../theme/colors';
import {radius} from '../../theme/radius';

const STATUS_MAP = {
  taken: {bg: colors.successLight, text: colors.success, label: 'Taken'},
  upcoming: {bg: colors.primaryLight, text: colors.primary, label: 'Upcoming'},
  pending: {bg: '#F3F4F6', text: colors.textMuted, label: 'Pending'},
  normal: {bg: colors.successLight, text: colors.success, label: 'Normal'},
  abnormal: {bg: colors.errorLight, text: colors.error, label: 'Abnormal'},
  borderline: {bg: colors.warningLight, text: colors.warning, label: 'Borderline'},
  paid: {bg: colors.successLight, text: colors.success, label: 'Paid'},
  pending_invoice: {bg: colors.warningLight, text: colors.warning, label: 'Pending'},
  cancelled: {bg: colors.errorLight, text: colors.error, label: 'Cancelled'},
  completed: {bg: colors.successLight, text: colors.success, label: 'Completed'},
  'in stock': {bg: colors.successLight, text: colors.success, label: 'In Stock'},
  'out of stock': {bg: colors.errorLight, text: colors.error, label: 'Out of Stock'},
};

export default function StatusChip({status, label, size = 'sm'}) {
  const key = (status || '').toLowerCase().replace(' ', '_');
  const cfg = STATUS_MAP[key] || STATUS_MAP[status?.toLowerCase()] || {bg: '#F3F4F6', text: '#9CA3AF', label: status};
  return (
    <View style={[styles.chip, {backgroundColor: cfg.bg}, size === 'xs' && styles.xs]}>
      <Text style={[styles.text, {color: cfg.text}, size === 'xs' && styles.xsText]}>{label || cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  xs: {paddingHorizontal: 6, paddingVertical: 2},
  text: {fontSize: 12, fontWeight: '600'},
  xsText: {fontSize: 10},
});
