import { StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '../core/theme';

type HeaderProps = {
  title: string;
  subtitle: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm
  },
  title: {
    fontSize: 24,
    fontFamily: font.heading,
    color: colors.ink,
    marginBottom: spacing.xs,
    lineHeight: 30,
    textShadowColor: 'rgba(28, 43, 58, 0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  subtitle: {
    fontSize: 14,
    fontFamily: font.body,
    color: colors.inkSoft,
    lineHeight: 20
  }
});
