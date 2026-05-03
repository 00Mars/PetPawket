import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Fit, RiveView, useRiveFile } from '@rive-app/react-native';
import { colors, font, radius, shadow, spacing } from '../core/theme';
import { PalAvatarProps } from './pal-avatar.types';

const defaultSprite = {
  id: 'preview',
  label: 'Pawket Pal',
  webSrc: 'https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv',
  nativeSource: 'https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv'
};

export function PalAvatar({
  sprite = defaultSprite,
  width = 280,
  height = 280,
  frame = true,
  artboard,
  stateMachine,
  title,
  style
}: PalAvatarProps) {
  const { riveFile, isLoading, error } = useRiveFile(sprite.nativeSource);

  if (isLoading) {
    return (
      <View style={[frame ? styles.frame : styles.plain, { width, height }, style]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !riveFile) {
    return (
      <View style={[frame ? styles.frame : styles.plain, { width, height }, style]}>
        <Text style={styles.title}>{title ?? sprite.label}</Text>
        <Text style={styles.body}>{String(error ?? 'Unknown')}</Text>
      </View>
    );
  }

  return (
    <View style={[frame ? styles.frame : styles.plain, { width, height }, style]}>
      <RiveView
        file={riveFile}
        fit={Fit.Contain}
        style={{ width: width - 20, height: height - 20 }}
        autoPlay
        artboardName={artboard}
        stateMachineName={stateMachine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    ...shadow.card
  },
  plain: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 14,
    fontFamily: font.ui,
    color: colors.ink,
    marginBottom: spacing.xs
  },
  body: {
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: 'center'
  }
});
