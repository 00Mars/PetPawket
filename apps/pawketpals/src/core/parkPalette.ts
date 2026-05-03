import { colors } from './theme';

export const parkZonePalette: Record<string, string> = {
  'central-plaza': colors.mapNode,
  'story-lane': colors.sparkle,
  'bloom-grove': colors.grass,
  'sunlit-meadow': colors.path,
  'riverbend-trail': colors.pond,
  'trailhead-terrace': colors.banner,
  'lantern-meadow': colors.banner,
  'starlight-steps': '#C7D2FF',
  'bazaar-row': colors.accentAlt,
  'whispering-grove': '#CDEEDC',
  'picnic-hill': '#FFD3B6',
  'event-green': '#BDE9B0',
  'moonlit-arcade': '#B9A7FF',
  'portal-gate': colors.accent
};

export const fallbackZoneColor = colors.accent;

export function getZoneColor(zoneId?: string) {
  if (!zoneId) return fallbackZoneColor;
  return parkZonePalette[zoneId] ?? fallbackZoneColor;
}
