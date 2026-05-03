import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow, spacing } from '../core/theme';

type TagRowProps = {
  tags: string[];
};

export function TagRow({ tags }: TagRowProps) {
  const palette = [
    { bg: colors.accentSoft, border: colors.border, text: colors.ink },
    { bg: colors.sky, border: colors.border, text: colors.ink },
    { bg: colors.grass, border: colors.border, text: colors.ink },
    { bg: colors.sparkle, border: colors.border, text: colors.ink }
  ];

  return (
    <View style={styles.row}>
      {tags.map((tag, index) => {
        const tone = palette[index % palette.length];
        return (
          <View key={tag} style={[styles.tag, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Text style={[styles.text, { color: tone.text }]}>{tag}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow.sticker
  },
  text: {
    fontSize: 11,
    fontFamily: font.ui,
    color: colors.ink
  }
});
