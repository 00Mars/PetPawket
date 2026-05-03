import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow, spacing } from '../core/theme';

type StatItem = {
  label: string;
  value: string;
  helper?: string;
};

type StatGridProps = {
  items: StatItem[];
};

export function StatGrid({ items }: StatGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={`${item.label}-${item.value}`} style={styles.card}>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
          {item.helper ? <Text style={styles.helper}>{item.helper}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  card: {
    flexBasis: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadow.sticker
  },
  value: {
    fontSize: 15,
    fontFamily: font.ui,
    color: colors.ink
  },
  label: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft
  },
  helper: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: font.body,
    color: colors.inkSoft
  }
});
