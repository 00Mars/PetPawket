import { useLocalSearchParams } from 'expo-router';
import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { TagRow } from '../../../src/components/TagRow';
import { StatGrid } from '../../../src/components/StatGrid';
import { PalSilhouette } from '../../../src/components/PalSilhouette';
import { pals } from '../../../src/core/mock/pals';
import { bondRituals, palBadges, palMoments, palProfiles } from '../../../src/core/mock/pals-extras';
import { colors, font, radius, spacing } from '../../../src/core/theme';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function PalDetailScreen() {
  const { palId } = useLocalSearchParams<{ palId?: string }>();
  const pal = pals.find((item) => item.id === palId);
  const profile = palProfiles.find((item) => item.palId === palId);
  const moments = palMoments.filter((item) => item.palId === palId).slice(0, 3);
  const badges = palBadges.filter((item) => item.palId === palId).slice(0, 2);

  if (!pal) {
    return (
      <ScreenLayout>
        <Header
          title="Nothing here yet — but it’s not empty."
          subtitle="New moments appear as the Park grows. Check back soon or start something of your own."
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <Header
        title={pal.name}
        subtitle="A Pawket Pal with a living story — and a place in the Park."
      />

      <TagRow tags={[pal.species, ...pal.personalityTags, `Bond Level ${pal.bondLevel}`]} />

      <View style={styles.homeZoneCard}>
        <LinearGradient colors={[colors.grass, colors.pond]} style={styles.homeZoneGradient} />
        <View style={styles.homeZoneRow}>
          <View style={styles.homeZoneText}>
            <Text style={styles.homeZoneTitle}>Home Zone</Text>
            <Text style={styles.homeZoneValue}>{profile?.homeZoneTitle || 'Pawket Park'}</Text>
            <Text style={styles.homeZoneNote}>Where {pal.name} spends quiet moments and park strolls.</Text>
          </View>
          <PalSilhouette species={pal.species} zoneId={pal.homeZoneId} size={86} />
        </View>
      </View>

      <SectionCard
        title="Pal Snapshot"
        description="A quick look at bond, home base, and recent Pawprints."
      >
        <StatGrid
          items={[
            { label: 'Bond Level', value: `${pal.bondLevel}` },
            { label: 'Home Zone', value: profile?.homeZoneTitle || 'Pawket Park' },
            { label: 'Pawprints', value: `${profile?.pawprints ?? 0}` },
            { label: 'Favorite Treat', value: profile?.favoriteTreat || 'Park treats' }
          ]}
        />
        <View style={styles.snapshotNote}>
          <Text style={styles.snapshotLabel}>Last moment</Text>
          <Text style={styles.snapshotValue}>{profile?.lastMoment || 'A gentle Park moment'}</Text>
        </View>
      </SectionCard>

      <SectionCard
        title="Favorite Activities"
        description="These are the small rituals and moments your Pal loves most."
      >
        <View style={styles.activityList}>
          {(profile?.favoriteActivities || ['Quiet strolls', 'Soft check-ins', 'Warm naps']).map((activity) => (
            <Text key={activity} style={styles.activityItem}>• {activity}</Text>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'Visit Pawket Park', href: '/park', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="Bond"
        description="Bond reflects shared time: strolls, check-ins, and moments you choose to save."
      >
        <InlineCTA
          actions={[
            { label: 'Take a Park Stroll', href: '/park', variant: 'primary' },
            { label: 'Share a Moment', href: '/share', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Story Capsule"
        description={`${pal.storySnippet} Full story pages will live here soon — with rescue/adoption/memorial context and creator credit.`}
      >
        <InlineCTA
          actions={[
            { label: 'Create Another Pal', href: '/create', variant: 'primary' },
            { label: 'Visit Town Square', href: '/town', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Memory Shelf"
        description="Saved Pawprints and Story Capsule moments."
      >
        <View style={styles.momentList}>
          {moments.map((moment) => (
            <View key={moment.id} style={styles.momentItem}>
              <Text style={styles.momentTitle}>{moment.title}</Text>
              <Text style={styles.momentBody}>{moment.description}</Text>
              <Text style={styles.momentMeta}>{moment.timestamp}</Text>
            </View>
          ))}
          {!moments.length ? (
            <Text style={styles.momentMeta}>New moments appear as the Park grows.</Text>
          ) : null}
        </View>
        <InlineCTA
          actions={[
            { label: 'Share a Moment', href: '/share', variant: 'primary' },
            { label: 'Visit Town Square', href: '/town', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Bond Rituals"
        description="As the Park grows, tiny rituals keep bonds warm and steady."
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
        title="Badges & Milestones"
        description="Story badges and gentle milestones that reflect your Pal’s journey."
      >
        <View style={styles.badgeList}>
          {badges.map((badge) => (
            <View key={badge.id} style={styles.badgeItem}>
              <Text style={styles.badgeTitle}>{badge.title}</Text>
              <Text style={styles.badgeBody}>{badge.description}</Text>
            </View>
          ))}
          {!badges.length ? (
            <Text style={styles.badgeBody}>Milestones appear as the Park grows.</Text>
          ) : null}
        </View>
        <InlineCTA actions={[{ label: 'View Profile', href: '/profile', variant: 'secondary' }]} />
      </SectionCard>

      <SectionCard
        title="Wardrobe (Coming Soon)"
        description="Outfits, collars, bandanas, seasonal accessories — all designed to stay cute and readable."
      >
        <InlineCTA actions={[{ label: 'Open Share Studio', href: '/share', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="Actions"
        description="Wave, cheer, hold a sign, and emote — cozy interactions made for sharing."
      >
        <InlineCTA
          actions={[
            { label: 'Wave (placeholder)', variant: 'secondary', onPress: () => {} },
            { label: 'Hold Sign (placeholder)', variant: 'secondary', onPress: () => {} }
          ]}
        />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  homeZoneCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.card
  },
  homeZoneGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35
  },
  homeZoneTitle: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  homeZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  homeZoneText: {
    flex: 1
  },
  homeZoneValue: {
    fontSize: 18,
    fontFamily: font.heading,
    color: colors.ink,
    marginBottom: 6
  },
  homeZoneNote: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  snapshotNote: {
    marginTop: spacing.sm
  },
  snapshotLabel: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  snapshotValue: {
    fontSize: 13,
    fontFamily: font.body,
    color: colors.ink
  },
  activityList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  activityItem: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  momentList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  momentItem: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
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
