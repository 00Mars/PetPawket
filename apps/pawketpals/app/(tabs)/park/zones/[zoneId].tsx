import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenLayout } from '../../../../src/components/ScreenLayout';
import { Header } from '../../../../src/components/Header';
import { SectionCard } from '../../../../src/components/SectionCard';
import { InlineCTA } from '../../../../src/components/InlineCTA';
import { PalSilhouette } from '../../../../src/components/PalSilhouette';
import { parkZones } from '../../../../src/core/mock/park';
import { pals } from '../../../../src/core/mock/pals';
import { colors, font, spacing } from '../../../../src/core/theme';

export default function ParkZoneDetailScreen() {
  const { zoneId } = useLocalSearchParams<{ zoneId?: string }>();
  const zone = parkZones.find((item) => item.id === zoneId);
  const relatedPals = pals.slice(0, 3);

  if (!zone) {
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
      <Header title={zone.title} subtitle={zone.description} />

      <SectionCard
        title="What You Can Do Here"
        description="This zone will host simple activities that raise bond, unlock cosmetics, and create shareable moments."
      >
        <InlineCTA
          actions={[
            { label: 'Visit Pawket Pals', href: '/pals', variant: 'primary' },
            { label: 'Share a Moment', href: '/share', variant: 'secondary' }
          ]}
        />
        <View style={styles.activityRow}>
          {zone.activities.map((activity) => (
            <Text key={activity} style={styles.activityText}>• {activity}</Text>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Seasonal Moments"
        description="Seasonal decorations and limited-time prompts will rotate through zones as the Park evolves."
      >
        <InlineCTA
          actions={[
            { label: 'Check Park Notices', href: '/park', variant: 'primary' },
            { label: 'See Events', href: '/events', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Related Pals or Stories"
        description="Example companions and Story Capsules tied to this neighborhood."
      >
        <View style={styles.relatedList}>
          {relatedPals.map((pal) => (
            <View key={pal.id} style={styles.relatedItem}>
              <PalSilhouette species={pal.species} zoneId={pal.homeZoneId} size={44} />
              <View style={styles.relatedContent}>
                <Text style={styles.relatedTitle}>{pal.name}</Text>
                <Text style={styles.relatedBody}>{pal.storySnippet}</Text>
              </View>
            </View>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'Open a Pal', href: `/pals/${relatedPals[0]?.id ?? ''}`, variant: 'primary' },
            { label: 'Visit Town Square', href: '/town', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Photo Spot (Coming Soon)"
        description="Capture a postcard of your Pal here — stickers, frames, and captions included."
      >
        <InlineCTA actions={[{ label: 'Open Share Studio', href: '/share', variant: 'primary' }]} />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  activityRow: {
    marginTop: spacing.sm
  },
  activityText: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 3
  },
  relatedList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  relatedItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: colors.accentSoft,
    paddingLeft: spacing.sm,
    marginBottom: spacing.sm
  },
  relatedContent: {
    flex: 1
  },
  relatedTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  relatedBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  }
});
