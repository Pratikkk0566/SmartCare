/**
 * SkeletonLoader — lightweight shimmer placeholders, no external deps.
 * Uses a looping Animated value to fade between two grey tones.
 *
 * Usage:
 *   <SkeletonLoader width={200} height={16} radius={4} />
 *   <SkeletonLoader.Card />          — generic card block
 *   <SkeletonLoader.ReportCard />    — investigation report row
 *   <SkeletonLoader.MedRow />        — medicine schedule row
 *   <SkeletonLoader.HomeSection />   — home screen medicine list
 */
import React, {useEffect, useRef} from 'react';
import {Animated, View, StyleSheet} from 'react-native';

const BASE  = '#E5E7EB';
const SHINE = '#F3F4F6';

function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {toValue: 1, duration: 800, useNativeDriver: true}),
        Animated.timing(anim, {toValue: 0, duration: 800, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

// ── Primitive bone ──────────────────────────────────────────────────────────
export default function SkeletonLoader({
  width = '100%',
  height = 16,
  radius = 6,
  style,
}) {
  const anim = useShimmer();
  const bg = anim.interpolate({inputRange: [0, 1], outputRange: [BASE, SHINE]});
  return (
    <Animated.View
      style={[
        {width, height, borderRadius: radius, backgroundColor: bg},
        style,
      ]}
    />
  );
}

// ── Generic card block ───────────────────────────────────────────────────────
SkeletonLoader.Card = function SkeletonCard({style}) {
  const anim = useShimmer();
  const bg   = anim.interpolate({inputRange: [0, 1], outputRange: [BASE, SHINE]});
  return (
    <View style={[s.card, style]}>
      <Animated.View style={[s.avatar, {backgroundColor: bg}]} />
      <View style={s.lines}>
        <Animated.View style={[s.lineWide,   {backgroundColor: bg}]} />
        <Animated.View style={[s.lineNarrow, {backgroundColor: bg}]} />
      </View>
    </View>
  );
};

// ── Investigation report row ─────────────────────────────────────────────────
SkeletonLoader.ReportCard = function SkeletonReportCard() {
  const anim = useShimmer();
  const bg   = anim.interpolate({inputRange: [0, 1], outputRange: [BASE, SHINE]});
  return (
    <View style={s.reportCard}>
      <Animated.View style={[s.reportIcon, {backgroundColor: bg}]} />
      <View style={s.reportLines}>
        <Animated.View style={[s.lineFull,   {backgroundColor: bg}]} />
        <Animated.View style={[s.lineShort,  {backgroundColor: bg}]} />
        <Animated.View style={[s.lineMid,    {backgroundColor: bg}]} />
      </View>
      <Animated.View style={[s.chip, {backgroundColor: bg}]} />
    </View>
  );
};

// ── Medicine row (home + schedule) ───────────────────────────────────────────
SkeletonLoader.MedRow = function SkeletonMedRow() {
  const anim = useShimmer();
  const bg   = anim.interpolate({inputRange: [0, 1], outputRange: [BASE, SHINE]});
  return (
    <View style={s.medRow}>
      <Animated.View style={[s.medIcon, {backgroundColor: bg}]} />
      <View style={s.medLines}>
        <Animated.View style={[s.lineWide,   {backgroundColor: bg}]} />
        <Animated.View style={[s.lineNarrow, {backgroundColor: bg}]} />
      </View>
      <Animated.View style={[s.chip, {backgroundColor: bg}]} />
    </View>
  );
};

// ── Home screen – full medicine section skeleton ─────────────────────────────
SkeletonLoader.HomeSection = function SkeletonHomeSection() {
  const anim = useShimmer();
  const bg   = anim.interpolate({inputRange: [0, 1], outputRange: [BASE, SHINE]});
  return (
    <View style={s.homeSection}>
      {/* section header bar */}
      <Animated.View style={[s.sectionBar, {backgroundColor: bg}]} />
      <SkeletonLoader.MedRow />
      <SkeletonLoader.MedRow />
      <SkeletonLoader.MedRow />
    </View>
  );
};

const s = StyleSheet.create({
  // Card
  card:       {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, elevation: 1},
  avatar:     {width: 48, height: 48, borderRadius: 10},
  lines:      {flex: 1, gap: 8},
  lineWide:   {height: 13, borderRadius: 6, width: '70%'},
  lineNarrow: {height: 11, borderRadius: 6, width: '45%'},

  // Report card
  reportCard:  {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, elevation: 1},
  reportIcon:  {width: 48, height: 48, borderRadius: 10},
  reportLines: {flex: 1, gap: 7},
  lineFull:    {height: 13, borderRadius: 6, width: '80%'},
  lineShort:   {height: 11, borderRadius: 6, width: '35%'},
  lineMid:     {height: 11, borderRadius: 6, width: '55%'},
  chip:        {width: 56, height: 24, borderRadius: 20},

  // Med row
  medRow:   {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, gap: 12, elevation: 1},
  medIcon:  {width: 40, height: 40, borderRadius: 8},
  medLines: {flex: 1, gap: 7},

  // Home section
  homeSection: {marginBottom: 14},
  sectionBar:  {height: 18, borderRadius: 6, width: '55%', marginBottom: 14},
});
