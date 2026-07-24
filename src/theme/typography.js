import {Platform} from 'react-native';

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
});

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const typography = {
  h1: {
    fontFamily,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: 40,
  },
  h2: {
    fontFamily,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: 34,
  },
  h3: {
    fontFamily,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: 30,
  },
  h4: {
    fontFamily,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: 20,
  },
  label: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 18,
  },
  caption: {
    fontFamily,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: 14,
  },
};
