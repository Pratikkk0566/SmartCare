import {useWindowDimensions} from 'react-native';

export const DESIGN_WIDTH = 390;
export const MIN_SCALE = 0.9;
export const MAX_SCALE = 1.12;

export function getWidthScale(width) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / DESIGN_WIDTH));
}

export function scale(size, width = DESIGN_WIDTH) {
  return Math.round(size * getWidthScale(width));
}

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function useResponsive() {
  const {width, height, scale: pixelScale, fontScale} = useWindowDimensions();
  return {
    width,
    height,
    pixelScale,
    fontScale,
    widthScale: getWidthScale(width),
    scale: value => scale(value, width),
  };
}