import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';
import {useApp} from '../../context/AppContext';
import {
  ArrowBackIcon, BellIcon, PillIcon, CalendarIcon,
  FlaskIcon, InvoiceIcon, InfoIcon, CheckCircleIcon,
} from '../../assets/icons/Icons';

// ─── Per-type config ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  medicine:    {Icon: PillIcon,     bg: '#EEE9FF', iconColor: colors.primary,  accent: colors.primary},
  appointment: {Icon: CalendarIcon, bg: '#DCFCE7', iconColor: colors.success,  accent: colors.success},
  report:      {Icon: FlaskIcon,    bg: '#DBEAFE', iconColor: colors.info,     accent: colors.info},
  invoice:     {Icon: InvoiceIcon,  bg: '#FEF3C7', iconColor: colors.warning,  accent: colors.warning},
  system:      {Icon: InfoIcon,     bg: '#F3F4F6', iconColor: colors.textMuted, accent: colors.textMuted},
};

function getConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.system;
}

// ─── Single card ──────────────────────────────────────────────────────────────
function NotifCard({item, onPress}) {
  const {Icon, bg, iconColor, accent} = getConfig(item.type);

  return (
    <TouchableOpacity
      style={[styles.card, item.read ? styles.cardRead : styles.cardUnread]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.75}>

      {/* Coloured left bar — unread only */}
      {!item.read && <View style={[styles.accentBar, {backgroundColor: accent}]} />}

      {/* Icon bubble */}
      <View style={[styles.iconBubble, {backgroundColor: bg}]}>
        <Icon size={20} color={iconColor} />
      </View>

      {/* Text block */}
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {!item.read && <View style={[styles.dot, {backgroundColor: accent}]} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({label, count}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {count > 0 && (
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <BellIcon size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>All caught up</Text>
      <Text style={styles.emptySub}>
        No notifications yet. We'll let you know when something needs your attention.
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function NotificationsScreen({navigation}) {
  const {notifications, markNotificationRead, markAllNotificationsRead} = useApp();

  const today   = notifications.filter(n => n.group === 'today');
  const earlier = notifications.filter(n => n.group === 'earlier');
  const unread  = notifications.filter(n => !n.read).length;

  const listData = [
    ...(today.length   ? [{type: 'header', id: 'h1', label: 'Today',   count: today.filter(n => !n.read).length}]   : []),
    ...today.map(n => ({...n, _type: 'item'})),
    ...(earlier.length ? [{type: 'header', id: 'h2', label: 'Earlier', count: earlier.filter(n => !n.read).length}] : []),
    ...earlier.map(n => ({...n, _type: 'item'})),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowBackIcon size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unread} new</Text>
            </View>
          )}
        </View>

        {unread > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllNotificationsRead}
            activeOpacity={0.7}>
            <CheckCircleIcon size={16} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerDivider} />

      {/* List or empty */}
      {notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.id}
          renderItem={({item}) =>
            item.type === 'header'
              ? <SectionHeader label={item.label} count={item.count} />
              : <NotifCard item={item} onPress={id => markNotificationRead && markNotificationRead(id)} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  unreadPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  headerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.base,
    marginBottom: spacing.xs,
  },

  // List
  list: {padding: spacing.base, paddingBottom: 40},
  separator: {height: spacing.sm},

  // Section
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRead: {
    opacity: 0.72,
  },
  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },

  // Icon bubble
  iconBubble: {
    width: 44, height: 44,
    borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 6,
  },

  // Text
  textWrap: {flex: 1},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 3,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 5,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  emptyIconWrap: {
    width: 88, height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});