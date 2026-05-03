import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, layout, spacing } from '../core/theme';

type ScreenLayoutProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function ScreenLayout({ children, scroll = true }: ScreenLayoutProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.background}>
          <LinearGradient
            colors={[colors.sky, colors.background]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.sun, styles.decor]} />
          <View style={[styles.cloudOne, styles.decor]} />
          <View style={[styles.cloudTwo, styles.decor]} />
          <View style={[styles.pond, styles.decor]} />
          <View style={[styles.path, styles.decor]} />
          <View style={[styles.mapLineOne, styles.decor]} />
          <View style={[styles.mapLineTwo, styles.decor]} />
          <View style={[styles.mapNodeOne, styles.decor]} />
          <View style={[styles.mapNodeTwo, styles.decor]} />
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        <LinearGradient
          colors={[colors.sky, colors.background]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.sun, styles.decor]} />
        <View style={[styles.cloudOne, styles.decor]} />
        <View style={[styles.cloudTwo, styles.decor]} />
        <View style={[styles.pond, styles.decor]} />
        <View style={[styles.path, styles.decor]} />
        <View style={[styles.mapLineOne, styles.decor]} />
        <View style={[styles.mapLineTwo, styles.decor]} />
        <View style={[styles.mapNodeOne, styles.decor]} />
        <View style={[styles.mapNodeTwo, styles.decor]} />
        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  background: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center'
  },
  sun: {
    position: 'absolute',
    top: -30,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.sparkle,
    opacity: 0.7
  },
  cloudOne: {
    position: 'absolute',
    top: 40,
    right: -30,
    width: 180,
    height: 90,
    borderRadius: 90,
    backgroundColor: colors.cloud,
    opacity: 0.9
  },
  cloudTwo: {
    position: 'absolute',
    top: 140,
    right: 40,
    width: 120,
    height: 60,
    borderRadius: 60,
    backgroundColor: colors.cloud,
    opacity: 0.7
  },
  pond: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 220,
    height: 140,
    borderRadius: 120,
    backgroundColor: colors.pond,
    opacity: 0.6
  },
  path: {
    position: 'absolute',
    bottom: -20,
    right: -60,
    width: 260,
    height: 140,
    borderRadius: 90,
    backgroundColor: colors.path,
    opacity: 0.45,
    transform: [{ rotate: '-8deg' }]
  },
  mapLineOne: {
    position: 'absolute',
    top: 160,
    left: -40,
    width: 260,
    height: 140,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: colors.mapLine,
    borderStyle: 'dashed',
    opacity: 0.5,
    transform: [{ rotate: '-8deg' }]
  },
  mapLineTwo: {
    position: 'absolute',
    bottom: 40,
    right: -80,
    width: 300,
    height: 160,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: colors.mapLine,
    borderStyle: 'dashed',
    opacity: 0.45,
    transform: [{ rotate: '6deg' }]
  },
  mapNodeOne: {
    position: 'absolute',
    top: 130,
    left: 40,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.mapNode,
    borderWidth: 2,
    borderColor: colors.border,
    opacity: 0.9
  },
  mapNodeTwo: {
    position: 'absolute',
    bottom: 120,
    right: 60,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.mapNode,
    borderWidth: 2,
    borderColor: colors.border,
    opacity: 0.9
  },
  decor: {
    pointerEvents: 'none'
  }
});
