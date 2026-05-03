import { ReactNode } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow, spacing } from '../core/theme';

type CTAAction = {
  label: string;
  href?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
};

type InlineCTAProps = {
  actions: CTAAction[];
};

export function InlineCTA({ actions }: InlineCTAProps) {
  return (
    <View style={styles.row}>
      {actions.map((action) => {
        const content = (
          <Pressable
            key={action.label}
            style={({ pressed }) => [
              styles.button,
              action.variant === 'secondary' && styles.buttonSecondary,
              action.variant === 'tertiary' && styles.buttonTertiary,
              action.disabled && styles.buttonDisabled,
              pressed && !action.disabled && styles.buttonPressed
            ]}
            onPress={action.onPress}
            disabled={action.disabled || !action.onPress && !action.href}
          >
            <Text
              style={[
                styles.buttonText,
                action.variant === 'secondary' && styles.buttonTextSecondary,
                action.variant === 'tertiary' && styles.buttonTextTertiary,
                action.disabled && styles.buttonTextDisabled
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        );

        if (action.href) {
          return (
            <Link key={action.label} href={action.href} asChild>
              {content}
            </Link>
          );
        }

        return <View key={action.label}>{content}</View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.xl,
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow.sticker
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border
  },
  buttonTertiary: {
    backgroundColor: colors.card
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: font.ui
  },
  buttonTextSecondary: {
    color: colors.ink
  },
  buttonTextTertiary: {
    color: colors.mapInk
  },
  buttonTextDisabled: {
    color: colors.inkSoft
  }
});
