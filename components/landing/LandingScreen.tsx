import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, FontFamily } from '@/theme/tokens';
import { SkillCard } from './SkillCard';
import { CarouselDots } from './CarouselDots';
import { LANDING_SKILLS } from '@/constants/skills';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { RestoreResult } from '@/lib/restore';
import { truncateEmailMiddle } from '@/lib/email';
import { getLocalProgress } from '@/lib/progress';
import { Track } from '@/lib/curriculum';

// Bottom-sheet-style width cap (matches FeedbackSheet/RestoreAccountModal/etc.)
// so the landing screen doesn't stretch edge-to-edge on wide/desktop viewports.
const CONTENT_MAX_WIDTH = 480;

interface LandingScreenProps {
  onStart: (track: Track) => void;
}

/**
 * Entry screen — skill pager only. There is no standalone mode picker here
 * anymore: tapping a SkillCard starts the default 'pairs' track directly
 * (or resumes in-progress work — PlaySession's own progress lookup jumps to
 * the right topic regardless of which track kicked off the download, same
 * as the old "Resume session" card did). Choosing a different learning mode
 * now happens later, via the ModeSwitcherSheet shown after a topic
 * completes — see components/landing/ModeSwitcherSheet.tsx.
 */
export function LandingScreen({ onStart }: LandingScreenProps) {
  const { colors } = useTheme();
  // Measured from the actual rendered layout (onLayout), not
  // useWindowDimensions() — the app is letterboxed on web, so the browser
  // window width doesn't match the real container pixel width. Trusting
  // window dimensions here caused the pager to stretch/crop after
  // navigating away and back (a resize event reports the wrong width).
  // Mirrors the fix already used for card width in CardDeck.tsx.
  const [pagerWidth, setPagerWidth] = useState(0);
  const handlePagerLayout = useCallback((e: LayoutChangeEvent) => {
    setPagerWidth(e.nativeEvent.layout.width);
  }, []);
  const [pageIndex, setPageIndex] = useState(0);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [completedTopics, setCompletedTopics] = useState(0);
  const [totalTopics, setTotalTopics] = useState(46);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  const refreshProgress = () => {
    getLocalProgress().then((p) => {
      if (p) {
        setCompletedTopics(p.completedTopics || 0);
        if (p.totalTopics > 0) setTotalTopics(p.totalTopics);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    refreshProgress();
    AsyncStorage.getItem('@play/user_email').then((email) => {
      if (email) setLinkedEmail(email);
    }).catch(() => {});
  }, []);

  const handleRestoreSuccess = (result: RestoreResult) => {
    refreshProgress();
    setLinkedEmail(result.email);
    onStart('pairs');
  };

  const handlePagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pagerWidth) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pagerWidth);
    setPageIndex(Math.max(0, Math.min(LANDING_SKILLS.length - 1, next)));
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.containerContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
      {/* Skill pager — one bordered SkillCard per skill, swipeable */}
      <View style={styles.middle} onLayout={handlePagerLayout}>
        {pagerWidth > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePagerScrollEnd}
          style={{ width: pagerWidth }}
        >
          {LANDING_SKILLS.map((skill) => (
            <View key={skill.id} style={{ width: pagerWidth }}>
              <SkillCard
                skill={skill}
                completedTopics={completedTopics}
                totalTopics={totalTopics}
                onPress={() => onStart('pairs')}
              />
            </View>
          ))}
        </ScrollView>
        )}

        {LANDING_SKILLS.length > 1 ? (
          <View style={styles.dotsWrap}>
            <CarouselDots total={LANDING_SKILLS.length} index={pageIndex} />
          </View>
        ) : null}
      </View>

      {/* Existing user, login link — outside the card */}
      <View style={styles.bottom}>
        <Pressable
          onPress={() => setRestoreModalVisible(true)}
          hitSlop={10}
          style={styles.restoreLinkWrap}
        >
          <Text style={[styles.restoreLinkText, { color: colors.onSurfaceVariant || '#9CA3AF' }]}>
            {linkedEmail ? `Logged in as ${truncateEmailMiddle(linkedEmail)}` : 'Existing user, login'}
          </Text>
        </Pressable>
      </View>

      {/* Restore Account Modal */}
      <RestoreAccountModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        onSuccess={handleRestoreSuccess}
        currentEmail={linkedEmail}
        onLoggedOut={() => setLinkedEmail(null)}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
  containerContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.xxl,
    justifyContent: 'space-between',
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsWrap: {
    marginTop: Spacing.xl,
  },
  bottom: {
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    width: '100%',
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
