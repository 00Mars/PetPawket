import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { PalSpecies } from '../core/types/pal';
import { colors, radius, shadow } from '../core/theme';
import { getZoneColor } from '../core/parkPalette';

type PalSilhouetteProps = {
  species: PalSpecies;
  zoneId?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const withAlpha = (hex: string, alpha: number) => {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function PalSilhouette({ species, zoneId, size = 56, style }: PalSilhouetteProps) {
  const tone = getZoneColor(zoneId);
  const backdrop = withAlpha(tone, 0.18);
  const baseSize = size * 0.62;

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: backdrop }, style]}>
      <View style={[styles.silhouette, { width: baseSize, height: baseSize }]}>
        <View
          style={[
            styles.body,
            {
              width: baseSize * 0.7,
              height: baseSize * 0.45,
              borderRadius: baseSize * 0.22,
              backgroundColor: tone
            }
          ]}
        />
        <View
          style={[
            styles.head,
            {
              width: baseSize * 0.5,
              height: baseSize * 0.5,
              borderRadius: baseSize * 0.25,
              backgroundColor: tone
            }
          ]}
        />
        {species === 'cat' ? (
          <>
            <View
              style={[
                styles.earCat,
                {
                  width: baseSize * 0.18,
                  height: baseSize * 0.18,
                  backgroundColor: tone,
                  left: baseSize * 0.1,
                  top: baseSize * 0.02
                }
              ]}
            />
            <View
              style={[
                styles.earCat,
                {
                  width: baseSize * 0.18,
                  height: baseSize * 0.18,
                  backgroundColor: tone,
                  right: baseSize * 0.1,
                  top: baseSize * 0.02
                }
              ]}
            />
          </>
        ) : (
          <>
            <View
              style={[
                styles.earDog,
                {
                  width: baseSize * 0.18,
                  height: baseSize * 0.3,
                  borderRadius: baseSize * 0.12,
                  backgroundColor: tone,
                  left: baseSize * 0.02,
                  top: baseSize * 0.12
                }
              ]}
            />
            <View
              style={[
                styles.earDog,
                {
                  width: baseSize * 0.18,
                  height: baseSize * 0.3,
                  borderRadius: baseSize * 0.12,
                  backgroundColor: tone,
                  right: baseSize * 0.02,
                  top: baseSize * 0.12
                }
              ]}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sticker
  },
  silhouette: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: {
    position: 'absolute',
    bottom: 0
  },
  head: {
    position: 'absolute',
    top: 0
  },
  earCat: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }]
  },
  earDog: {
    position: 'absolute'
  }
});
