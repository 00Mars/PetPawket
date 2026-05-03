import { StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { homeSpaces } from '../../../src/core/mock/home';
import { colors, font, radius, spacing } from '../../../src/core/theme';

export default function HomeSpaceScreen() {
  const home = homeSpaces[0];

  return (
    <ScreenLayout>
      <Header
        title="Home Space"
        subtitle="A personal corner of Pawket Park for your Pal’s cozy moments."
      />

      <SectionCard
        title="Home Space Overview"
        description="A preview of your Pal’s space and theme."
      >
        {home ? (
          <View style={styles.homeCard}>
            <Text style={styles.homeName}>{home.name}</Text>
            <Text style={styles.homeTheme}>{home.theme}</Text>
            <Text style={styles.homeMeta}>{home.visitors} recent visitors</Text>
          </View>
        ) : (
          <Text style={styles.homeEmpty}>Example home spaces will appear here.</Text>
        )}
        <InlineCTA
          actions={[
            { label: 'Visit Town Square', href: '/town', variant: 'primary' },
            { label: 'Back to Park', href: '/park', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Customization"
        description="Place items, set your theme, and adjust your Pal’s cozy layout as the Park grows."
      >
        {home ? (
          <View style={styles.itemList}>
            {home.items.map((item) => (
              <Text key={item} style={styles.itemText}>• {item}</Text>
            ))}
          </View>
        ) : null}
        <InlineCTA actions={[{ label: 'Customize (placeholder)', variant: 'secondary', onPress: () => {} }]} />
      </SectionCard>

      <SectionCard
        title="Guestbook"
        description="Leave notes for friends and welcome visitors as the Park grows."
      >
        <InlineCTA
          actions={[
            { label: 'Open Guestbook (placeholder)', variant: 'secondary', onPress: () => {} },
            { label: 'Visit Pals', href: '/pals', variant: 'primary' }
          ]}
        />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  homeCard: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  homeName: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  homeTheme: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  },
  homeMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  homeEmpty: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: spacing.sm
  },
  itemList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  itemText: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 4
  }
});
