import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Path, Rect, Circle, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { useApp } from '../../context/AppContext';

const { width, height } = Dimensions.get('window');

// Animated SVG wrapper
const AnimatedView = Animated.createAnimatedComponent(View);

function AppLogo() {
  return (
    <Svg width={110} height={110} viewBox="0 0 200 200" fill="none">
      {/* Outer glow circle */}
      <Circle cx="100" cy="100" r="90" fill="rgba(255,255,255,0.08)" />
      <Circle cx="100" cy="100" r="72" fill="rgba(255,255,255,0.12)" />

      {/* Heart */}
      <Path
        d="M100 148 C100 148 55 118 55 88 C55 70 67 60 80 60 C90 60 97 67 100 73 C103 67 110 60 120 60 C133 60 145 70 145 88 C145 118 100 148 100 148Z"
        fill="white"
        opacity={0.95}
      />

      {/* Medical cross on heart */}
      <Rect x="93" y="80" width="14" height="38" rx="4" fill="#6C63FF" />
      <Rect x="82" y="91" width="36" height="14" rx="4" fill="#6C63FF" />

      {/* Small pulse line below heart */}
      <Path
        d="M62 162 L76 162 L82 152 L88 172 L94 156 L100 162 L138 162"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function SplashScreen({ navigation }) {
    const { isLoggedIn } = useApp();

  // Animation values
  const logoScale    = useRef(new Animated.Value(0)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const nameOpacity  = useRef(new Animated.Value(0)).current;
  const nameY        = useRef(new Animated.Value(24)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const dot1         = useRef(new Animated.Value(0.3)).current;
  const dot2         = useRef(new Animated.Value(0.3)).current;
  const dot3         = useRef(new Animated.Value(0.3)).current;
  const bgScale      = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity  = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Background blob expand
    Animated.timing(bgScale, {
      toValue: 1, duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Ring pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0,    duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Logo spring in
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1, tension: 55, friction: 6, useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
      ]),
    ]).start();

    // App name slide up
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 1, duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(nameY, {
          toValue: 0, duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Tagline fade in
    Animated.sequence([
      Animated.delay(1050),
      Animated.timing(tagOpacity, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
    ]).start();

    // Loading dots bounce
    const dotAnim = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      );
    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        dotAnim(dot1, 0),
        dotAnim(dot2, 180),
        dotAnim(dot3, 360),
      ]),
    ]).start();

    // Navigate after 2.6s
     // Navigate after 2.6s
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('Welcome');
      }
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>

      {/* Decorative background blobs */}
      <Animated.View style={[styles.blob1, { transform: [{ scale: bgScale }] }]} />
      <Animated.View style={[styles.blob2, { transform: [{ scale: bgScale }] }]} />
      <Animated.View style={[styles.blob3, { transform: [{ scale: bgScale }] }]} />

      {/* Small accent circles */}
      <View style={[styles.accent, { top: '12%', left: '8%',  width: 12, height: 12, opacity: 0.4 }]} />
      <View style={[styles.accent, { top: '18%', right: '12%', width: 8,  height: 8,  opacity: 0.3 }]} />
      <View style={[styles.accent, { bottom: '22%', left: '14%', width: 10, height: 10, opacity: 0.35 }]} />
      <View style={[styles.accent, { bottom: '16%', right: '10%', width: 14, height: 14, opacity: 0.3 }]} />

      {/* Center content */}
      <View style={styles.center}>

        {/* Pulsing ring behind logo */}
        <Animated.View style={[
          styles.pulseRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]} />

        {/* Logo */}
        <Animated.View style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
          <AppLogo />
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[
          styles.appName,
          { opacity: nameOpacity, transform: [{ translateY: nameY }] },
        ]}>
          SmartCare PHR
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Your Health, Our Priority
        </Animated.Text>

      </View>

      {/* Loading dots */}
      <Animated.View style={[styles.dotsWrap, { opacity: tagOpacity }]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </Animated.View>

      {/* Bottom tagline */}
      <Animated.Text style={[styles.bottomText, { opacity: tagOpacity }]}>
        Trusted Health Companion
      </Animated.Text>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Background decorative blobs
  blob1: {
    position: 'absolute',
    top: -80, left: -80,
    width: 280, height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  blob2: {
    position: 'absolute',
    bottom: -100, right: -60,
    width: 320, height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blob3: {
    position: 'absolute',
    top: height * 0.35, left: -40,
    width: 180, height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  accent: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'white',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pulsing ring
  pulseRing: {
    position: 'absolute',
    width: 180, height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  // Logo circle background
  logoWrap: {
    width: 150, height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  appName: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 10,
  },

  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Loading dots
  dotsWrap: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  bottomText: {
    position: 'absolute',
    bottom: 52,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});