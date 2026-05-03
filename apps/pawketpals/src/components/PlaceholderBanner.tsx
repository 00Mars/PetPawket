import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow, spacing } from '../core/theme';

export function PlaceholderBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.pin} />
      <Text style={styles.kicker}>Announcement Board</Text>
      <Text style={styles.title}>Park Under Construction</Text>
      <Text style={styles.body}>
        You’re early — the paths are still being laid. Explore what’s open, leave a pawprint, and help shape the world.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.banner,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 3,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
    ...shadow.card
  },
  pin: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentAlt,
    borderWidth: 2,
    borderColor: colors.border
  },
  kicker: {
    fontSize: 10,
    fontFamily: font.ui,
    color: colors.mapInk,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.xs
  },
  title: {
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: spacing.xs
  },
  body: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    lineHeight: 19
  }
});
