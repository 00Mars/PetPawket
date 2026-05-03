import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { TagRow } from '../../../src/components/TagRow';
import { StatGrid } from '../../../src/components/StatGrid';
import { PalSilhouette } from '../../../src/components/PalSilhouette';
import { pals } from '../../../src/core/mock/pals';
import { bondRituals, palBadges, palMoments } from '../../../src/core/mock/pals-extras';
import { colors, font, radius, shadow, spacing } from '../../../src/core/theme';
import { Link } from 'expo-router';

export default function PalsIndexScreen() {
  const firstPal = pals[0];
  const averageBond = pals.length
    ? (pals.reduce((sum, pal) => sum + pal.bondLevel, 0) / pals.length).toFixed(1)
    : '0';
  const featuredPals = pals.slice(0, 3);
  const recentMoments = palMoments.slice(0, 3);
  const spotlightBadges = palBadges.slice(0, 3);

  return (
    <ScreenLayout>
      <Header
        title="Pawket Pals"
        subtitle="Collect companions, build bonds, and bring your story to life."
      />

      <View style={styles.albumBand}>
        <Text style={styles.bandTitle}>Pal Album</Text>
        <Text style={styles.bandSubtitle}>A cozy binder of companions, bonds, and Story Capsules.</Text>
        <View style={styles.albumTabs}>
          <Text style={[styles.albumTab, styles.albumTabActive]}>All Pals</Text>
          <Text style={styles.albumTab}>Story Capsules</Text>
          <Text style={styles.albumTab}>Rituals</Text>
        </View>
        <SectionCard
          title="Collection Snapshot"
          description="A quick look at your Pawket Pals, bond energy, and Pawprints so far."
        >
          <StatGrid
            items={[
              { label: 'Total Pals', value: `${pals.length}` },
              { label: 'Average Bond', value: `${averageBond}` },
              { label: 'Pawprints', value: `${palMoments.length}` },
              { label: 'Story Capsules', value: `${pals.length}` }
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Your Companions"
          description="Your Pals live here — ready for strolls, emotes, outfits, and new memories."
        >
          <InlineCTA
            actions={[
              {
                label: 'Open a Pal',
                href: firstPal ? `/pals/${firstPal.id}` : '/pals',
                variant: 'primary'
              },
              { label: 'Create a Pal', href: '/create', variant: 'secondary' }
            ]}
          />
          <View style={styles.list}>
            {pals.map((pal) => (
              <Link key={pal.id} href={`/pals/${pal.id}`} asChild>
                <Pressable style={styles.item}>
                  <PalSilhouette species={pal.species} zoneId={pal.homeZoneId} size={48} />
                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{pal.name}</Text>
                      <Text style={styles.itemBadge}>Bond {pal.bondLevel}</Text>
                    </View>
                    <Text style={styles.itemSubtitle}>{pal.species}</Text>
                    <TagRow tags={[...pal.personalityTags]} />
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </SectionCard>
      </View>

      <SectionCard
        title="Story Capsule Shelf"
        description="Recent Pawprints and Story Capsules to revisit as the Park grows."
      >
        <View style={styles.momentList}>
          {recentMoments.map((moment) => (
            <View key={moment.id} style={styles.momentItem}>
              <Text style={styles.momentTitle}>{moment.title}</Text>
              <Text style={styles.momentBody}>{moment.description}</Text>
              <Text style={styles.momentMeta}>{moment.timestamp}</Text>
            </View>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'Visit Town Square', href: '/town', variant: 'primary' },
            { label: 'Open Share Studio', href: '/share', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Bond Rituals"
        description="Small rituals that keep bonds warm and steady."
      >
        <View style={styles.ritualList}>
          {bondRituals.slice(0, 3).map((ritual) => (
            <View key={ritual.id} style={styles.ritualItem}>
              <Text style={styles.ritualTitle}>{ritual.title}</Text>
              <Text style={styles.ritualBody}>{ritual.description}</Text>
            </View>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'Explore Rituals', href: '/pals/rituals', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="Featured Pals"
        description="A rotating spotlight of seasonal vibes, community favorites, and story-led companions."
      >
        <View style={styles.featuredGrid}>
          {featuredPals.map((pal) => (
            <Link key={pal.id} href={`/pals/${pal.id}`} asChild>
              <Pressable style={styles.featuredCard}>
                <View style={styles.featuredHeader}>
                  <PalSilhouette species={pal.species} zoneId={pal.homeZoneId} size={44} />
                  <View style={styles.featuredText}>
                    <Text style={styles.featuredName}>{pal.name}</Text>
                    <Text style={styles.featuredDetail}>{pal.storySnippet}</Text>
                  </View>
                </View>
                <TagRow tags={[...pal.personalityTags.slice(0, 2), `Bond ${pal.bondLevel}`]} />
              </Pressable>
            </Link>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'Visit Town Square', href: '/town', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="Bond & Personality"
        description="Bonds grow through tiny rituals: check-ins, zone strolls, sharing moments, and gentle goals."
      >
        <InlineCTA actions={[{ label: 'Go to Pawket Park', href: '/park', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="Milestones & Badges"
        description="As the Park grows, Pals collect gentle milestones and story badges."
      >
        <View style={styles.badgeList}>
          {spotlightBadges.map((badge) => (
            <View key={badge.id} style={styles.badgeItem}>
              <Text style={styles.badgeTitle}>{badge.title}</Text>
              <Text style={styles.badgeBody}>{badge.description}</Text>
            </View>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'View Profile', href: '/profile', variant: 'secondary' }]} />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  albumBand: {
    backgroundColor: colors.cloud,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card
  },
  bandTitle: {
    fontSize: 17,
    fontFamily: font.ui,
    color: colors.ink
  },
  bandSubtitle: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: spacing.md
  },
  albumTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  albumTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 11,
    fontFamily: font.ui,
    color: colors.mapInk
  },
  albumTabActive: {
    backgroundColor: colors.mapNode,
    color: colors.ink
  },
  list: {
    marginTop: spacing.md
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    ...shadow.sticker
  },
  itemContent: {
    flex: 1
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink
  },
  itemBadge: {
    fontSize: 10,
    fontFamily: font.ui,
    color: colors.mapInk,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.border
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
    textTransform: 'capitalize'
  },
  momentList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  momentItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs
  },
  momentTitle: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  momentBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  momentMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  ritualList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  ritualItem: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  ritualTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  ritualBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  featuredGrid: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  featuredCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.sm,
    width: '48%',
    ...shadow.sticker
  },
  featuredHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  featuredText: {
    flex: 1
  },
  featuredName: {
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 6
  },
  featuredDetail: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: spacing.xs
  },
  badgeList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  badgeItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accentSoft,
    paddingLeft: spacing.sm,
    marginBottom: spacing.sm
  },
  badgeTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  badgeBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  }
});
