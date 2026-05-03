import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { StatGrid } from '../../../src/components/StatGrid';
import { communityCircles } from '../../../src/core/mock/community';
import { profileBadges, profileSnapshot } from '../../../src/core/mock/profile';
import { colors, font, radius, spacing } from '../../../src/core/theme';
import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <ScreenLayout>
      <Header
        title="Your Profile"
        subtitle="Your identity in the Park — your Pals, badges, and community footprint."
      />

      <SectionCard
        title="Profile Snapshot"
        description="A quick view of your Pawprints, circles, and story activity."
      >
        <StatGrid
          items={[
            { label: 'Pawprints', value: `${profileSnapshot.pawprints}` },
            { label: 'Circles', value: `${profileSnapshot.circles}` },
            { label: 'Badges', value: `${profileSnapshot.badges}` },
            { label: 'Stories', value: `${profileSnapshot.stories}` }
          ]}
        />
        <Text style={styles.snapshotMeta}>Member since {profileSnapshot.memberSince}</Text>
      </SectionCard>

      <SectionCard
        title="Your Avatar Pal"
        description="Pick a Pal to represent you around the Park. (This will power visits and chat presence later.)"
      >
        <InlineCTA actions={[{ label: 'Choose a Pal', href: '/pals', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="Home Space"
        description="Your Pal’s personal space for cozy moments and visits."
      >
        <InlineCTA
          actions={[
            { label: 'Open Home Space', href: '/home', variant: 'primary' },
            { label: 'Back to Park', href: '/park', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Community Circles"
        description="Your community groups for rituals, strolls, and Town Square moments."
      >
        <View style={styles.circleList}>
          {communityCircles.map((circle) => (
            <View key={circle.id} style={styles.circleItem}>
              <Text style={styles.circleTitle}>{circle.name}</Text>
              <Text style={styles.circleBody}>{circle.focus}</Text>
              <Text style={styles.circleMeta}>{circle.activity}</Text>
            </View>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'Browse Circles (placeholder)', variant: 'secondary', onPress: () => {} }]} />
      </SectionCard>

      <SectionCard
        title="Badges & Milestones"
        description="Small, gentle achievements earned around the Park."
      >
        <View style={styles.badgeList}>
          {profileBadges.map((badge) => (
            <View key={badge.id} style={styles.badgeItem}>
              <Text style={styles.badgeTitle}>{badge.title}</Text>
              <Text style={styles.badgeBody}>{badge.description}</Text>
            </View>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'Visit Town Square', href: '/town', variant: 'secondary' }]} />
      </SectionCard>

      <SectionCard
        title="Friends & Visits (Coming Soon)"
        description="Add friends, visit Parks, and leave notes at their guestbook as the Park grows."
      >
        <InlineCTA actions={[{ label: 'Visit Town Square', href: '/town', variant: 'primary' }]} />
      </SectionCard>

      <SectionCard
        title="Settings"
        description="Notifications, privacy, and profile customization will live here."
      >
        <InlineCTA actions={[{ label: 'Open Settings (placeholder)', variant: 'secondary', onPress: () => {} }]} />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  snapshotMeta: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  circleList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  circleItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accentSoft,
    paddingLeft: spacing.sm,
    marginBottom: spacing.sm
  },
  circleTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  circleBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  circleMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  badgeList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  badgeItem: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
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
