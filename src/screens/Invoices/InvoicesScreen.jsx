import React, {useState} from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'; 
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {invoices} from '../../data/mockData';
import {ArrowBackIcon, FilterIcon, DocumentIcon, DownloadIcon, ArrowRightIcon} from '../../assets/icons/Icons';
import StatusChip from '../../components/common/StatusChip';

const TABS = ['All', 'Paid', 'Pending', 'Cancelled'];

const STATUS_COLORS = {Paid: colors.success, Pending: colors.warning, Cancelled: colors.error};
const STATUS_BG = {Paid: colors.successLight, Pending: colors.warningLight, Cancelled: colors.errorLight};

export default function InvoicesScreen({navigation}) {
  const [activeTab, setActiveTab] = useState('All');

  const filteredInvoices = invoices.filter(inv =>
    activeTab === 'All' ? true : inv.status === activeTab,
  );

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + parseFloat(i.amount.replace(/[₹,]/g, '') || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + parseFloat(i.amount.replace(/[₹,]/g, '') || 0), 0);
  const totalCancelled = invoices.filter(i => i.status === 'Cancelled').reduce((sum, i) => sum + parseFloat(i.amount.replace(/[₹,]/g, '') || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <ArrowBackIcon size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoices & Bills</Text>
          <FilterIcon size={22} color={colors.textSecondary} />
        </View>

        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabSelected]} onPress={() => setActiveTab(t)}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextSelected]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Invoices</Text>

        {filteredInvoices.map(inv => (
          <TouchableOpacity key={inv.id} style={styles.invRow} onPress={() => Alert.alert(inv.id, `Amount: ${inv.amount}\nDate: ${inv.date}\nStatus: ${inv.status}\n${inv.description}`)} activeOpacity={0.8}>
            <View style={[styles.invIcon, {backgroundColor: STATUS_BG[inv.status] || '#F3F4F6'}]}>
              <DocumentIcon size={22} color={STATUS_COLORS[inv.status] || colors.textMuted} />
            </View>
            <View style={styles.invInfo}>
              <Text style={styles.invId}>{inv.id}</Text>
              <Text style={styles.invDate}>{inv.date} • {inv.time}</Text>
              <Text style={styles.invDesc}>{inv.description}</Text>
            </View>
            <View style={styles.invRight}>
              <Text style={styles.invAmount}>{inv.amount}</Text>
              <StatusChip status={inv.status} size="xs" />
            </View>
            <ArrowRightIcon size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={styles.helpCard}>
          <View style={[styles.helpIcon, {backgroundColor: colors.primaryLight}]}>
            <DownloadIcon size={24} color={colors.primary} />
          </View>
          <View style={styles.helpInfo}>
            <Text style={styles.helpTitle}>Need an Invoice?</Text>
            <Text style={styles.helpSub}>Download your invoice and claim for insurance reimbursement.</Text>
            <TouchableOpacity style={styles.learnBtn} onPress={() => Alert.alert('Learn More', 'Download feature coming soon!')}>
              <Text style={styles.learnBtnText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{invoices.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, styles.statBorderLeft]}>
            <Text style={[styles.statNum, {color: colors.success}]}>{invoices.filter(i => i.status === 'Paid').length}</Text>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={[styles.statAmount, {color: colors.success}]}>₹{totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorderLeft]}>
            <Text style={[styles.statNum, {color: colors.warning}]}>{invoices.filter(i => i.status === 'Pending').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statAmount, {color: colors.warning}]}>₹{totalPending.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
          </View>
          <View style={[styles.statBox, styles.statBorderLeft]}>
            <Text style={[styles.statNum, {color: colors.error}]}>{invoices.filter(i => i.status === 'Cancelled').length}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
            <Text style={[styles.statAmount, {color: colors.error}]}>₹{totalCancelled.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  scroll: {padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 32},
  header: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base},
  back: {padding: 4},
  headerTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  tabBar: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, marginBottom: spacing.base, ...shadows.sm},
  tab: {flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm},
  tabSelected: {backgroundColor: colors.primary},
  tabText: {fontSize: 13, color: colors.textSecondary, fontWeight: '500'},
  tabTextSelected: {color: '#fff', fontWeight: '700'},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md},
  invRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, marginBottom: spacing.sm, gap: spacing.md},
  invIcon: {width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
  invInfo: {flex: 1},
  invId: {fontSize: 13, fontWeight: '700', color: colors.textPrimary},
  invDate: {fontSize: 11, color: colors.textMuted, marginTop: 2},
  invDesc: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  invRight: {alignItems: 'flex-end', gap: 4},
  invAmount: {fontSize: 14, fontWeight: '700', color: colors.textPrimary},
  helpCard: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.base, ...shadows.sm, gap: spacing.md, marginBottom: spacing.base},
  helpIcon: {width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
  helpInfo: {flex: 1},
  helpTitle: {fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4},
  helpSub: {fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm},
  learnBtn: {borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6, alignSelf: 'flex-start'},
  learnBtnText: {color: colors.primary, fontSize: 12, fontWeight: '700'},
  summaryGrid: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, ...shadows.sm, marginBottom: spacing.base},
  statBox: {flex: 1, padding: spacing.md, alignItems: 'center'},
  statBorderLeft: {borderLeftWidth: 1, borderLeftColor: colors.border},
  statNum: {fontSize: 18, fontWeight: '700', color: colors.textPrimary},
  statLabel: {fontSize: 11, color: colors.textMuted, marginTop: 2},
  statAmount: {fontSize: 10, fontWeight: '600', marginTop: 2},
});
