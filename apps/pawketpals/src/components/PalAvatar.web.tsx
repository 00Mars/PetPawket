import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRive } from '@rive-app/react-canvas';
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
  const source = sprite.webSrc;
  const { RiveComponent, rive } = useRive({
    src: source,
    autoplay: true,
    artboard,
    stateMachines: stateMachine ? [stateMachine] : undefined
  });

  if (!source) {
    return (
      <View style={[frame ? styles.frame : styles.plain, { width, height }, style]}>
        <Text style={styles.title}>{title ?? sprite.label}</Text>
        <Text style={styles.body}>No Rive source provided.</Text>
      </View>
    );
  }

  if (!RiveComponent || !rive) {
    return (
      <View style={[frame ? styles.frame : styles.plain, { width, height }, style]}>
        <Text style={styles.title}>{title ?? sprite.label}</Text>
        <Text style={styles.body}>Loading the Rive canvas...</Text>
      </View>
    );
  }

  return (
    <View style={[frame ? styles.frame : styles.plain, { width, height }, style]}>
      <RiveComponent style={styles.rive} />
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
  rive: {
    width: '100%',
    height: '100%'
  },
  title: {
    fontSize: 16,
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
