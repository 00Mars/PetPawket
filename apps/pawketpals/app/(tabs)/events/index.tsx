import { StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { townEvents } from '../../../src/core/mock/community';
import { colors, font, radius, spacing } from '../../../src/core/theme';

const eventTypes = [
  'Example: Community strolls and meetups',
  'Example: Real-world partner events',
  'Example: Seasonal pop-ups and story circles'
];

export default function EventsScreen() {
  return (
    <ScreenLayout>
      <Header
        title="Events"
        subtitle="Park gatherings, real-world tie-ins, and cozy community moments."
      />

      <SectionCard
        title="Event List"
        description="Example events to help shape the Park’s calendar."
      >
        <View style={styles.eventList}>
          {townEvents.map((event) => (
            <View key={event.id} style={styles.eventItem}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventBody}>{event.summary}</Text>
              <Text style={styles.eventMeta}>{event.date} • {event.location}</Text>
            </View>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'RSVP (placeholder)', variant: 'secondary', onPress: () => {} }]} />
      </SectionCard>

      <SectionCard
        title="Event Types"
        description="A quick view of the kinds of gatherings planned for the Park."
      >
        <View style={styles.typeList}>
          {eventTypes.map((type) => (
            <Text key={type} style={styles.typeItem}>• {type}</Text>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'Visit Town Square', href: '/town', variant: 'primary' },
            { label: 'Back to Park', href: '/park', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="RSVP"
        description="RSVP capture will open here as the Park grows."
      >
        <InlineCTA
          actions={[
            { label: 'RSVP (placeholder)', variant: 'secondary', onPress: () => {} },
            { label: 'Open Share Studio', href: '/share', variant: 'primary' }
          ]}
        />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  eventList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  eventItem: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  eventTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  eventBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  eventMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  typeList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  typeItem: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 6
  }
});
