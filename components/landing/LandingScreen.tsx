import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Spacing, Radius, Typography, FontFamily } from '@/theme/tokens';
import { BrandGradients } from '@/constants/gradients';
import { LandingIllustration } from './LandingIllustration';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { RestoreResult } from '@/lib/restore';
import { getLocalProgress } from '@/lib/progress';

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
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [completedTopics, setCompletedTopics] = useState(0);
  const [totalTopics, setTotalTopics] = useState(34);
  const slide = SLIDES[index];

  const refreshProgress = () => {
    getLocalProgress().then((p) => {
      if (p) {
        setCompletedTopics(p.completedTopics);
        if (p.totalTopics > 0) setTotalTopics(p.totalTopics);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    refreshProgress();
  }, []);

  const handleRestoreSuccess = (_result: RestoreResult) => {
    refreshProgress();
    // Proceed directly into practice/resume
    onStart();
  };

  const progressFraction = totalTopics > 0 ? completedTopics / totalTopics : 0;
  const progressPercent = Math.min(100, Math.round(progressFraction * 100));

  return (
    <View style={styles.container}>
      {/* 1. Header & Dynamic Progress */}
      <View style={styles.top}>
        <Text style={[Typography.headlineXl, styles.title, { color: colors.onSurface }]}>
          {slide.title}
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressSegment,
              { backgroundColor: '#2B303C' },
            ]}
          >
            {completedTopics > 0 ? (
              <View
                style={{
                  height: '100%',
                  width: `${Math.max(6, progressPercent)}%`,
                  borderRadius: Radius.full,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={['#2BD964', '#2BD9C4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            ) : (
              <LinearGradient
                colors={['#2BD964', '#2BD9C4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { width: '45%' }]}
              />
            )}
          </View>
        </View>

        <Text
          style={[
            Typography.bodyLg,
            styles.subtitle,
            { color: completedTopics > 0 ? (colors.tealAccent || '#2BD9C4') : (colors.onSurfaceVariant || '#9CA3AF') },
          ]}
        >
          {completedTopics > 0
            ? `${completedTopics}/${totalTopics} topics done`
            : slide.subtitle}
        </Text>
      </View>

      {/* 2. Hero 3D Illustration & Carousel Dots */}
      <View style={styles.middle}>
        <LandingIllustration />

        {/* Triple Pill Carousel Indicators matching design */}
        <View style={styles.dotsRow}>
          <View style={[styles.dotPill, styles.dotInactive]} />
          <View style={[styles.dotPill, styles.dotActive]} />
          <View style={[styles.dotPill, styles.dotInactive]} />
        </View>
      </View>

      {/* 3. Bottom CTAs */}
      <View style={styles.bottom}>
        <Pressable
          onPress={onStart}
          style={({ pressed }) => [
            styles.startBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <Text style={styles.startBtnText}>
            {completedTopics > 0 ? 'Resume Session' : 'Start Practice'}
          </Text>
        </Pressable>

        {/* Existing user, login link */}
        <Pressable
          onPress={() => setRestoreModalVisible(true)}
          hitSlop={10}
          style={styles.restoreLinkWrap}
        >
          <Text style={[styles.restoreLinkText, { color: colors.onSurfaceVariant || '#9CA3AF' }]}>
            Existing user, login
          </Text>
        </Pressable>
      </View>

      {/* Restore Account Modal */}
      <RestoreAccountModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        onSuccess={handleRestoreSuccess}
      />
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
    lineHeight: 38,
  },
  progressTrack: {
    flexDirection: 'row',
    width: '56%',
    marginTop: Spacing.md,
  },
  progressSegment: {
    flex: 1,
    height: 5.5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.xl,
  },
  dotPill: {
    height: 7,
    borderRadius: 4,
  },
  dotInactive: {
    width: 14,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 44,
    backgroundColor: '#84E1CD',
  },
  bottom: {
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  startBtn: {
    width: '100%',
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: '#56D8B8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#56D8B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  startBtnText: {
    color: '#10141A',
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    letterSpacing: 0.2,
  },
  restoreLinkWrap: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  restoreLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
