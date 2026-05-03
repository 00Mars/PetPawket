import { StyleSheet, Text, View } from 'react-native';
import { InlineCTA } from './InlineCTA';
import { colors, font, radius, spacing, shadow } from '../core/theme';

type SpriteGalleryProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onAdd?: () => void;
};

export function SpriteGallery({ title, subtitle, children, onAdd }: SpriteGalleryProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.grid}>{children}</View>
      <InlineCTA
        actions={[
          {
            label: 'Add sprite (placeholder)',
            variant: 'secondary',
            onPress: onAdd || (() => {})
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card
  },
  title: {
    fontSize: 18,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    marginBottom: spacing.sm
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm
  }
});
