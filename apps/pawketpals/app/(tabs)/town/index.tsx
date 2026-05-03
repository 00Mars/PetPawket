import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { ScreenLayout } from '../../../src/components/ScreenLayout';
import { Header } from '../../../src/components/Header';
import { SectionCard } from '../../../src/components/SectionCard';
import { InlineCTA } from '../../../src/components/InlineCTA';
import { StatGrid } from '../../../src/components/StatGrid';
import { PlaceholderBanner } from '../../../src/components/PlaceholderBanner';
import { PalSilhouette } from '../../../src/components/PalSilhouette';
import { communityCircles, townEvents, townPosts, townPrompts } from '../../../src/core/mock/community';
import { pals } from '../../../src/core/mock/pals';
import { colors, font, radius, shadow, spacing } from '../../../src/core/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function TownSquareScreen() {
  const firstPost = townPosts[0];
  const totalPawprints = townPosts.reduce((sum, post) => sum + post.pawprints, 0);
  const palById = new Map(pals.map((pal) => [pal.id, pal]));

  return (
    <ScreenLayout>
      <Header
        title="Town Square"
        subtitle="A cozy public plaza for Pal moments, story highlights, and friendly pawprints."
      />

      <PlaceholderBanner />

      <View style={styles.plazaCard}>
        <LinearGradient colors={[colors.grass, colors.path]} style={styles.plazaGradient} />
        <View style={styles.plazaBadge}>
          <Text style={styles.plazaBadgeText}>Town Plaza</Text>
        </View>
        <Text style={styles.plazaTitle}>Town Plaza</Text>
        <Text style={styles.plazaBody}>Gather, leave Pawprints, and share gentle moments with the community.</Text>
        <InlineCTA
          actions={[
            { label: 'Leave a Pawprint', href: '/town/posts/post-1', variant: 'primary' },
            { label: 'Open Share Studio', href: '/share', variant: 'secondary' }
          ]}
        />
      </View>

      <SectionCard
        title="Town Square Pulse"
        description="A quick pulse check on what’s happening around the Park."
      >
        <StatGrid
          items={[
            { label: 'Pawprints shared', value: `${totalPawprints}` },
            { label: 'Active circles', value: `${communityCircles.length}` },
            { label: 'Open prompts', value: `${townPrompts.length}` },
            { label: 'Upcoming events', value: `${townEvents.length}` }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Latest Pawprints"
        description="Short posts from the community — moments, milestones, and little joys."
      >
        <InlineCTA
          actions={[
            {
              label: 'Open a Post',
              href: firstPost ? `/town/posts/${firstPost.id}` : '/town',
              variant: 'primary'
            }
          ]}
        />
        <View style={styles.list}>
          {townPosts.map((post) => (
            <Link key={post.id} href={`/town/posts/${post.id}`} asChild>
              <Pressable style={styles.item}>
                <View style={styles.itemRow}>
                  <PalSilhouette
                    species={palById.get(post.palId)?.species ?? 'dog'}
                    zoneId={palById.get(post.palId)?.homeZoneId}
                    size={44}
                  />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemCaption}>{post.caption}</Text>
                    <Text style={styles.itemMeta}>{post.authorName} • {post.timestamp}</Text>
                    <View style={styles.reactionRow}>
                      <Text style={styles.reactionText}>🐾 {post.pawprints}</Text>
                      <Text style={styles.reactionText}>💬 {post.cheers}</Text>
                      <Text style={styles.reactionText}>✨ {post.stickers}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Community Prompts"
        description="Gentle prompts that invite a Pawprint or Story Capsule update."
      >
        <View style={styles.promptList}>
          {townPrompts.map((prompt) => (
            <View key={prompt.id} style={styles.promptItem}>
              <Text style={styles.promptTitle}>{prompt.title}</Text>
              <Text style={styles.promptBody}>{prompt.description}</Text>
              <Text style={styles.promptMeta}>{prompt.cta}</Text>
            </View>
          ))}
        </View>
        <InlineCTA
          actions={[
            { label: 'Open Share Studio', href: '/share', variant: 'primary' },
            { label: 'Create a Pal', href: '/create', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Community Circles"
        description="Join a circle to share rituals, park strolls, and gentle moments."
      >
        <View style={styles.circleList}>
          {communityCircles.map((circle) => (
            <View key={circle.id} style={styles.circleItem}>
              <Text style={styles.circleTitle}>{circle.name}</Text>
              <Text style={styles.circleBody}>{circle.focus}</Text>
              <Text style={styles.circleMeta}>{circle.members} members • {circle.activity}</Text>
            </View>
          ))}
        </View>
        <InlineCTA actions={[{ label: 'Join a Circle (placeholder)', variant: 'secondary', onPress: () => {} }]} />
      </SectionCard>

      <SectionCard
        title="Events & Gatherings"
        description="Small meetups and shared moments for the Town Square."
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
        <InlineCTA
          actions={[
            { label: 'View Events', href: '/events', variant: 'primary' },
            { label: 'RSVP (placeholder)', variant: 'secondary', onPress: () => {} }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Spotlight"
        description="Featured story capsules, seasonal prompts, and community celebrations will rotate here."
      >
        <InlineCTA
          actions={[
            { label: 'Create a Pal', href: '/create', variant: 'primary' },
            { label: 'Share a Moment', href: '/share', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Visits & Chat (Coming Soon)"
        description="Friend visits, guestbook notes, and light presence chat are on the roadmap."
      >
        <InlineCTA actions={[{ label: 'View Profile', href: '/profile', variant: 'primary' }]} />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.md
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sticker
  },
  itemRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start'
  },
  itemContent: {
    flex: 1
  },
  itemCaption: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.ink,
    marginBottom: 4
  },
  itemMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  reactionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  reactionText: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  promptList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  promptItem: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sticker
  },
  promptTitle: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  promptBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: 6
  },
  promptMeta: {
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  circleList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  circleItem: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sticker
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
  eventList: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  eventItem: {
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sticker
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
  plazaCard: {
    borderRadius: radius.xl,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...shadow.card
  },
  plazaGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45
  },
  plazaTitle: {
    fontSize: 18,
    fontFamily: font.heading,
    color: colors.ink,
    marginBottom: spacing.xs
  },
  plazaBody: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: spacing.sm
  },
  plazaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mapNode,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs
  },
  plazaBadgeText: {
    fontSize: 10,
    fontFamily: font.ui,
    color: colors.mapInk,
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});
