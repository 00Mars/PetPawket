import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { ScreenLayout } from '../src/components/ScreenLayout';
import { Header } from '../src/components/Header';
import { SectionCard } from '../src/components/SectionCard';
import { InlineCTA } from '../src/components/InlineCTA';
import { parkNotices, parkPortals } from '../src/core/mock/park';
import { colors, font, radius, shadow, spacing } from '../src/core/theme';

export default function ParkMapHome() {
  return (
    <ScreenLayout>
      <Header
        title="Pawket Park"
        subtitle="A living world where stories become companions — and companions build community."
      />

      <SectionCard
        title="Park Map"
        description="Choose a neighborhood to enter and start exploring the Park."
      >
        <InlineCTA
          actions={[
            { label: 'Enter the Park', href: '/park', variant: 'primary' },
            { label: 'Create a Pal', href: '/create', variant: 'secondary' }
          ]}
        />
        <View style={styles.portalGrid}>
          {parkPortals.map((portal) => (
            <Link key={portal.id} href={portal.href} asChild>
              <Pressable style={styles.portalCard}>
                <View style={styles.portalHeader}>
                  <Text style={styles.portalTitle}>{portal.title}</Text>
                  <Text style={styles.portalTag}>{portal.tag ?? 'Zone'}</Text>
                </View>
                <Text style={styles.portalBody}>{portal.description}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Today’s Notices"
        description="Example notices and prompts around the Park."
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
            { label: 'Go to Events', href: '/events', variant: 'secondary' },
            { label: 'Visit Town Square', href: '/town', variant: 'primary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Quick Links"
        description="Jump to the main spaces of the Park."
      >
        <InlineCTA
          actions={[
            { label: 'Pawket Pals', href: '/pals', variant: 'primary' },
            { label: 'Town Square', href: '/town', variant: 'secondary' },
            { label: 'Share Studio', href: '/share', variant: 'secondary' },
            { label: 'Home Space', href: '/home', variant: 'secondary' }
          ]}
        />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
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
  portalTag: {
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
    marginTop: spacing.sm,
    marginBottom: spacing.sm
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
  }
});
