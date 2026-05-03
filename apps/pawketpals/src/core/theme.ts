import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  background: '#FFF4D6',
  card: '#FFFEF6',
  surfaceMuted: '#FFE8C4',
  ink: '#1C2B3A',
  inkSoft: '#5A6A79',
  accent: '#2F6DFF',
  accentAlt: '#FF7CC2',
  accentSoft: '#FFE0B3',
  border: '#E0B774',
  banner: '#FFE1A6',
  sparkle: '#FFF0FA',
  sky: '#BFE9FF',
  grass: '#CFF6C1',
  path: '#FFD0A3',
  pond: '#A9DBFF',
  cloud: '#FFFFFF',
  mapLine: '#F2C375',
  mapNode: '#FFE9A8',
  mapInk: '#2B4960'
};

export const spacing = {
  xxs: 6,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28
};

const shadowCardNative: ViewStyle = {
  shadowColor: '#1B2F3E',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.16,
  shadowRadius: 24,
  elevation: 6
};

const shadowStickerNative: ViewStyle = {
  shadowColor: '#1B2F3E',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 4
};

const shadowCardWeb: ViewStyle = {
  boxShadow: '0px 12px 26px rgba(27, 47, 62, 0.16)'
};

const shadowStickerWeb: ViewStyle = {
  boxShadow: '0px 6px 14px rgba(27, 47, 62, 0.2)'
};

function selectShadow(web: ViewStyle, native: ViewStyle): ViewStyle {
  return Platform.select<ViewStyle>({ web, native }) ?? native;
}

export const shadow = {
  card: selectShadow(shadowCardWeb, shadowCardNative),
  sticker: selectShadow(shadowStickerWeb, shadowStickerNative)
};

export const layout = {
  maxWidth: 920
};

export const font = {
  heading: 'Baloo2_700Bold',
  ui: 'Baloo2_600SemiBold',
  body: 'Baloo2_400Regular'
};
