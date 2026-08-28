import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Spacing, Radius, Typography, FontFamily } from '@/theme/tokens';
import { BrandGradients } from '@/constants/gradients';
import { LandingIllustration } from './LandingIllustration';

export interface LandingSlide {
  title: string;
  subtitle: string;
}

const SLIDES: LandingSlide[] = [
  { title: 'Practice over 1000\nhighway code\nquestions', subtitle: 'Driving theory' },
];

interface LandingScreenProps {
  onStart: () => void;
}

export function LandingScreen({ onStart }: LandingScreenProps) {
  const { colors } = useTheme();
  const [index] = useState(0);
  const slide = SLIDES[index];

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={[Typography.headlineXl, styles.title, { color: colors.onSurface }]}>
          {slide.title}
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressSegment,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <LinearGradient
              colors={BrandGradients.discovery.colors}
              start={BrandGradients.discovery.start}
              end={BrandGradients.discovery.end}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>

        <Text style={[Typography.bodyLg, styles.subtitle, { color: colors.tealAccent }]}>
          {slide.subtitle}
        </Text>
      </View>

      <View style={styles.middle}>
        <LandingIllustration />

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.onSurface : colors.surfaceContainerHigh,
                  width: i === index ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={onStart} style={styles.startBtn}>
          <Text style={styles.startBtnText}>START PRACTICE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  title: {
    textAlign: 'center',
  },
  progressTrack: {
    flexDirection: 'row',
    width: '60%',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  progressSegmentWrap: {
    flex: 1,
  },
  progressSegment: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  subtitle: {
    marginTop: Spacing.sm,
  },
  middle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },
  bottom: {
    paddingBottom: Spacing.lg,
  },
  startBtn: {
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: '#F8F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#1A1D24',
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
