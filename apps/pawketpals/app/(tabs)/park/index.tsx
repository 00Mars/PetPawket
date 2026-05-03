import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { PlaceholderBanner } from '../../../src/components/PlaceholderBanner';
import { parkHighlights, parkNotices, parkPortals } from '../../../src/core/mock/park';
import { colors, font, radius, shadow, spacing } from '../../../src/core/theme';
import { Link } from 'expo-router';

export default function ParkHubScreen() {
  const firstPortal = parkPortals[0];

  return (
    <ScreenLayout>
      <Header
        title="Pawket Park"
        subtitle="Your Pal’s home base — part garden, part town, part storybook."
      />

      <PlaceholderBanner />

      <SectionCard
        title="Map Legend & Portals"
        description="Use the legend, then choose a portal to step into a neighborhood."
      >
        <InlineCTA
          actions={[
            {
              label: 'Open a Portal',
              href: firstPortal ? firstPortal.href : '/park',
              variant: 'primary'
            },
            { label: 'Back to Map', href: '/', variant: 'secondary' }
          ]}
        />
        <View style={styles.zoneLegend}>
          <Text style={styles.zoneLegendLabel}>Map Legend</Text>
          <View style={styles.zoneLegendRow}>
            <Text style={styles.zoneLegendItem}>● Active zone</Text>
            <Text style={styles.zoneLegendItem}>★ Seasonal</Text>
            <Text style={styles.zoneLegendItem}>⌂ Home hub</Text>
          </View>
        </View>
        <View style={styles.portalGrid}>
          {parkPortals.map((portal) => (
            <Link key={portal.id} href={portal.href} asChild>
              <Pressable style={styles.portalCard}>
                <View style={styles.portalHeader}>
                  <Text style={styles.portalTitle}>{portal.title}</Text>
                  <Text style={styles.portalPill}>{portal.tag ?? 'Zone'}</Text>
                </View>
                <Text style={styles.portalBody}>{portal.description}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Park Notice Board"
        description="Today’s little happenings — gentle goals, small rewards, and community moments."
      >
        <View style={styles.noticeList}>
          {parkNotices.map((notice) => (
            <View key={notice.id} style={styles.noticeItem}>
              <Text style={styles.noticeType}>{notice.type}</Text>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              {notice.cta ? <Text style={styles.noticeCta}>{notice.cta}</Text> : null}
            </View>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'View Town Square', href: '/town', variant: 'primary' },
            { label: 'Open Share Studio', href: '/share', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Park Updates"
        description="Seasonal highlights and new moments around the Park."
      >
        <View style={styles.updateList}>
          {parkHighlights.map((highlight) => (
            <View key={highlight.id} style={styles.updateItem}>
              <Text style={styles.updateTitle}>{highlight.title}</Text>
              <Text style={styles.updateBody}>{highlight.description}</Text>
            </View>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'Explore Events', href: '/events', variant: 'secondary' },
            { label: 'Visit Pals', href: '/pals', variant: 'primary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Park Connections"
        description="Keep moving through the Park with quick links and gentle prompts."
      >
        <InlineCTA
          actions={[
            { label: 'Town Square', href: '/town', variant: 'primary' },
            { label: 'Share Studio', href: '/share', variant: 'secondary' },
            { label: 'Home Space', href: '/home', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <Link href="/(tabs)/park/rive-demo" style={styles.riveLink}>
        Open Rive Demo
      </Link>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  zoneLegend: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  zoneLegendLabel: {
    fontSize: 11,
    fontFamily: font.ui,
    color: colors.mapInk,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.1
  },
  zoneLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  zoneLegendItem: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  portalGrid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  portalCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadow.sticker
  },
  portalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  portalTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink
  },
  portalPill: {
    fontSize: 10,
    fontFamily: font.ui,
    color: colors.mapInk,
    backgroundColor: colors.mapNode,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.border
  },
  portalBody: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  noticeList: {
    marginBottom: spacing.md,
    marginTop: spacing.xs
  },
  noticeItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accentSoft,
    paddingLeft: spacing.sm,
    marginBottom: spacing.sm
  },
  noticeType: {
    fontSize: 10,
    fontFamily: font.ui,
    color: colors.mapInk,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  noticeTitle: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.ink,
    marginTop: 4,
    marginBottom: 2
  },
  noticeCta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  updateList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  updateItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  updateTitle: {
    fontSize: 13,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  updateBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  riveLink: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontFamily: font.ui,
    color: colors.accent
  }
});
