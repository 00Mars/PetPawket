import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { PlaceholderBanner } from '../../../src/components/PlaceholderBanner';
import { shareChallenges, shareTemplates, stickerPacks } from '../../../src/core/mock/share';
import { colors, font, radius, shadow, spacing } from '../../../src/core/theme';
import { StyleSheet, Text, View } from 'react-native';

export default function ShareStudioScreen() {
  return (
    <ScreenLayout>
      <Header
        title="Share Studio"
        subtitle="Make social-ready goodies — posters, cards, stickers, and mini-moments."
      />

      <PlaceholderBanner />

      <SectionCard
        title="Pal Cards"
        description="Generate a clean share card: name, vibe, bond level, and a caption you can edit."
      >
        <InlineCTA
          actions={[
            { label: 'Create a Pal Card', variant: 'secondary', onPress: () => {} },
            { label: 'Pick a Pal', href: '/pals', variant: 'primary' }
          ]}
        />
      </SectionCard>

      <View style={styles.craftTable}>
        <Text style={styles.craftTitle}>Craft Table</Text>
        <Text style={styles.craftBody}>Mix templates, stickers, and prompts to build a shareable moment.</Text>
        <SectionCard
          title="Shareable Templates"
          description="Pick a layout for your next Pawprint or Story Capsule moment."
        >
          <View style={styles.templateGrid}>
            {shareTemplates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <Text style={styles.templateTitle}>{template.title}</Text>
                <Text style={styles.templateBody}>{template.description}</Text>
                <Text style={styles.templateMeta}>{template.format}</Text>
              </View>
            ))}
          </View>
          <InlineCTA
            actions={[
              { label: 'Create a Template (placeholder)', variant: 'secondary', onPress: () => {} },
              { label: 'Pick a Pal', href: '/pals', variant: 'primary' }
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Sticker Packs"
          description="Tiny expressions, Park icons, and bond badges for replies and shares."
        >
          <View style={styles.stickerList}>
            {stickerPacks.map((pack) => (
              <View key={pack.id} style={styles.stickerItem}>
                <Text style={styles.stickerTitle}>{pack.title}</Text>
                <Text style={styles.stickerBody}>{pack.description}</Text>
                <Text style={styles.stickerMeta}>{pack.tags.join(' • ')}</Text>
              </View>
            ))}
          </View>
          <InlineCTA actions={[{ label: 'Request stickers (placeholder)', variant: 'secondary', onPress: () => {} }]} />
        </SectionCard>
      </View>

      <SectionCard
        title="Posters & Stickers (Coming Soon)"
        description="Seasonal frames, captions, and sticker packs will live here for quick sharing as the Park grows."
      >
        <InlineCTA actions={[{ label: 'View Media Kit', variant: 'secondary', onPress: () => {} }]} />
      </SectionCard>

      <SectionCard
        title="Pawprint Prompts"
        description="Gentle prompts to spark a Town Square post."
      >
        <View style={styles.challengeList}>
          {shareChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeItem}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.challengeBody}>{challenge.description}</Text>
            </View>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'Post a Pawprint (placeholder)', variant: 'secondary', onPress: () => {} },
            { label: 'Go to Town Square', href: '/town', variant: 'primary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Share to Town Square"
        description="Post a Pawprint to the Town Square — small, cozy, and community-first."
      >
        <InlineCTA actions={[{ label: 'Go to Town Square', href: '/town', variant: 'primary' }]} />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  templateGrid: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm
  },
  templateCard: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...shadow.sticker
  },
  templateTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  templateBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  templateMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  stickerList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  stickerItem: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sticker
  },
  stickerTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  stickerBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  stickerMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  challengeList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  challengeItem: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sticker
  },
  challengeTitle: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  challengeBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  craftTable: {
    backgroundColor: colors.cloud,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card
  },
  craftTitle: {
    fontSize: 17,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  craftBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: spacing.md
  }
});
