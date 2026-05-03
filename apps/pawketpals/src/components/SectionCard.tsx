import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow, spacing } from '../core/theme';

type SectionCardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 3,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadow.card
  },
  title: {
    fontSize: 16,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: spacing.xs,
    lineHeight: 20
  },
  description: {
    fontSize: 12,
    fontFamily: font.body,
    color: colors.inkSoft,
    lineHeight: 18
  },
  body: {
    marginTop: spacing.sm
  }
});
