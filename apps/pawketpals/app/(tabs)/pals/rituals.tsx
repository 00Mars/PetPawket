import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { PlaceholderBanner } from '../../../src/components/PlaceholderBanner';
import { bondRituals } from '../../../src/core/mock/pals-extras';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../../../src/core/theme';

export default function PalRitualsScreen() {
  return (
    <ScreenLayout>
      <Header
        title="Bond Rituals"
        subtitle="Small, cozy rituals that keep bonds warm as the Park grows."
      />

      <PlaceholderBanner />

      <SectionCard
        title="Daily Rituals"
        description="Gentle check-ins and Park strolls that keep your Pal close."
      >
        <View style={styles.list}>
          {bondRituals.slice(0, 2).map((ritual) => (
            <View key={ritual.id} style={styles.item}>
              <Text style={styles.itemTitle}>{ritual.title}</Text>
              <Text style={styles.itemBody}>{ritual.description}</Text>
            </View>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'Open Pawket Pals', href: '/pals', variant: 'primary' },
            { label: 'Visit Pawket Park', href: '/park', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Story Capsule Rituals"
        description="Save one sentence about today’s moment to keep your Story Capsule warm."
      >
        <InlineCTA
          actions={[
            { label: 'Create a Pal', href: '/create', variant: 'primary' },
            { label: 'Share a Moment', href: '/share', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Bond Boosters"
        description="Small moments that quietly raise bond and spark new Pawprints."
      >
        <View style={styles.list}>
          {bondRituals.slice(2).map((ritual) => (
            <View key={ritual.id} style={styles.item}>
              <Text style={styles.itemTitle}>{ritual.title}</Text>
              <Text style={styles.itemBody}>{ritual.description}</Text>
            </View>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'Visit Town Square', href: '/town', variant: 'secondary' }]} />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.sm
  },
  item: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  itemBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  }
});
