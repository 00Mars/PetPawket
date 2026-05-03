import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { PalAvatar } from '../../../src/components/PalAvatar';
import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { SpriteGallery } from '../../../src/components/SpriteGallery';
import { riveSprites } from '../../../src/core/mock/rive';
import { colors, font, spacing } from '../../../src/core/theme';

export default function RiveDemo() {
  return (
    <ScreenLayout>
      <Text style={styles.title}>Rive Demo</Text>
      <Text style={styles.subtitle}>
        This page proves the Pawket Pals avatar pipeline. Web uses a placeholder for now; native uses the Rive runtime.
      </Text>

      <SectionCard
        title="Avatar Preview"
        description="A glimpse of how animated Pals can live inside the Park."
      >
        <View style={styles.previewWrap}>
          <PalAvatar sprite={riveSprites[0]} width={300} height={300} />
        </View>
      </SectionCard>

      <SpriteGallery
        title="Sprite Gallery"
        subtitle="Drop your .riv files into assets/rive and preview them here."
      >
        {riveSprites.map((sprite) => (
          <View key={sprite.id} style={styles.galleryItem}>
            <Text style={styles.galleryLabel}>{sprite.label}</Text>
            <PalAvatar sprite={sprite} width={240} height={240} />
          </View>
        ))}
      </SpriteGallery>

      <InlineCTA actions={[{ label: 'Back to Park', href: '/park', variant: 'secondary' }]} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontFamily: font.heading,
    color: colors.ink,
    marginBottom: spacing.xs
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: spacing.md
  },
  previewWrap: {
    alignItems: 'center',
    marginTop: spacing.sm
  },
  galleryItem: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.sm,
    backgroundColor: colors.card
  },
  galleryLabel: {
    fontSize: 12,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: spacing.xs
  }
});
