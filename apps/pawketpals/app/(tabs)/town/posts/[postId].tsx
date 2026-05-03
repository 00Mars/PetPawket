import { useLocalSearchParams } from 'expo-router';
import { ScreenLayout } from '../../../../src/components/ScreenLayout';
import { Header } from '../../../../src/components/Header';
import { SectionCard } from '../../../../src/components/SectionCard';
import { InlineCTA } from '../../../../src/components/InlineCTA';
import { townPosts } from '../../../../src/core/mock/community';
import { colors, font, spacing } from '../../../../src/core/theme';
import { StyleSheet, Text, View } from 'react-native';

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const post = townPosts.find((item) => item.id === postId);

  if (!post) {
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
        title="Pawprint"
        subtitle="A small moment from the Park — shared with the Town Square."
      />

      <SectionCard
        title="The Moment"
        description={`${post.caption} — ${post.authorName}`}
      >
        <View style={styles.reactionRow}>
          <Text style={styles.reactionText}>🐾 {post.pawprints} Pawprints</Text>
          <Text style={styles.reactionText}>💬 {post.cheers} Cheers</Text>
          <Text style={styles.reactionText}>✨ {post.stickers} Stickers</Text>
        </View>
        {post.tags?.length ? (
          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <Text key={tag} style={styles.tagChip}>{tag}</Text>
            ))}
          </View>
        ) : null}
        <InlineCTA
          actions={[
            { label: 'View Related Pal', href: `/pals/${post.palId}`, variant: 'primary' },
            { label: 'Open Share Studio', href: '/share', variant: 'secondary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Leave a Pawprint"
        description="Add a small note or reaction to this moment as the Park grows."
      >
        <InlineCTA
          actions={[
            { label: 'Leave a Pawprint (placeholder)', variant: 'secondary', onPress: () => {} },
            { label: 'Share a Moment', href: '/share', variant: 'primary' }
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Reactions (Coming Soon)"
        description="Soon you’ll be able to react with stickers, pawprints, and gentle emotes as the Park grows."
      >
        <InlineCTA
          actions={[{ label: 'Leave a Pawprint (placeholder)', variant: 'secondary', onPress: () => {} }]}
        />
      </SectionCard>

      <SectionCard
        title="Replies (Coming Soon)"
        description="This will become a cozy thread — supportive, friendly, and moderated as the Park grows."
      >
        <InlineCTA actions={[{ label: 'Back to Town Square', href: '/town', variant: 'primary' }]} />
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm
  },
  reactionText: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  tagChip: {
    fontSize: 11,
    fontFamily: font.ui,
    color: colors.inkSoft,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999
  }
});
