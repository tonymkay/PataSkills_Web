import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, FontFamily } from '@/theme/tokens';
import { SkillGridCard } from './SkillGridCard';
import { LANDING_SKILLS } from '@/constants/skills';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { RestoreResult } from '@/lib/restore';
import { truncateEmailMiddle } from '@/lib/email';
import { getLocalProgress } from '@/lib/progress';
import { Track } from '@/lib/curriculum';

// Bottom-sheet-style width cap (matches FeedbackSheet/RestoreAccountModal/etc.)
// so the landing screen doesn't stretch edge-to-edge on wide/desktop viewports.
const CONTENT_MAX_WIDTH = 480;

// TEMP: layout smoke-test only. LANDING_SKILLS currently ships a single
// real skill (driving-theory) — this repeats it 4x purely to check how the
// 2-column "Skills Corner"-style grid reads with a full 2x2 layout. Remove
// once there's more than one real skill and map LANDING_SKILLS directly.
const GRID_TEST_COUNT = 4;

interface LandingScreenProps {
  /** Skill card tap — advances to LearningStyleScreen. */
  onStart: () => void;
  /** Successful account restore — resumes the learner's existing
   *  progress directly, skipping LearningStyleScreen (they already
   *  picked a track on whichever device they started on). */
  onRestore: (track: Track) => void;
}

/**
 * Entry screen — 2-column grid of skill cards ("Skills Corner"-style
 * redesign). Tapping a card advances to LearningStyleScreen, where the
 * learner picks a track before download starts. Choosing a different
 * learning mode later (after a topic completes) reuses the same track
 * list via ModeSwitcherSheet — see components/landing/ModeSwitcherSheet.tsx.
 */
export function LandingScreen({ onStart, onRestore }: LandingScreenProps) {
  const { colors } = useTheme();
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  const refreshProgress = () => {
    getLocalProgress().then(() => {
      // Progress isn't surfaced on the grid cards in this design — kept
      // as a no-op hook point so resume-detection logic has somewhere to
      // live once the grid needs to show it again.
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
    onRestore('pairs');
  };

  const gridSkills = Array.from({ length: GRID_TEST_COUNT }, (_, i) => ({
    ...LANDING_SKILLS[0],
    key: `${LANDING_SKILLS[0].id}-${i}`,
  }));

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.containerContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={[styles.heading, { color: colors.onSurface }]}>Skills Corner</Text>

        <View style={styles.grid}>
          {gridSkills.map((skill) => (
            <SkillGridCard key={skill.key} skill={skill} onPress={onStart} />
          ))}
        </View>

        {/* Existing user, login link — outside the grid */}
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.gutter,
  },
  bottom: {
    paddingTop: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  restoreLinkWrap: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  restoreLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
