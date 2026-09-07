import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, FontFamily } from '@/theme/tokens';
import { SkillGridCard } from './SkillGridCard';
import { LANDING_SKILLS, getLandingSkill } from '@/constants/skills';
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { RestoreResult } from '@/lib/restore';
import { truncateEmailMiddle } from '@/lib/email';
import { getLocalProgress, areTabsUnlocked } from '@/lib/progress';
import { Track } from '@/lib/curriculum';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

// Bottom-sheet-style width cap (matches FeedbackSheet/RestoreAccountModal/etc.)
// so the landing screen doesn't stretch edge-to-edge on wide/desktop viewports.
const CONTENT_MAX_WIDTH = 480;

interface LandingScreenProps {
  /** Skill card tap — advances to LearningStyleScreen for that skill. */
  onStart: (skillId: CurriculumSlug) => void;
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
  // Once tabs are unlocked, AppHeader (shown above this screen in the
  // "Skills" tab) already surfaces identity + a Settings gear that owns
  // login/restore — so this screen's own login link becomes redundant
  // and is hidden. Pre-unlock (rendered with no header, via app/index.tsx's
  // gate), it's the only way to log in and stays exactly as before.
  const [tabsUnlocked, setTabsUnlocked] = useState(false);
  // Which skills exist at all, and their display titles, both come from
  // play_curricula (is_active=true) via lib/curriculaCatalog.ts — so
  // shipping a new skill is a DB row + storage upload, not an app-code
  // change/rebuild. LANDING_SKILLS is only the offline/pre-fetch fallback
  // (renders instantly before this resolves) for skills known at build
  // time; any catalog row with no LANDING_SKILLS entry is merged in once
  // this resolves, using getLandingSkill()'s generic default for its
  // tracks/illustration behavior.
  const [catalogRows, setCatalogRows] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    getCurriculaCatalog()
      .then((rows) => setCatalogRows(rows.map((r) => ({ slug: r.slug, title: r.title }))))
      .catch(() => {});
  }, []);

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
    areTabsUnlocked().then(setTabsUnlocked);
  }, []);

  const handleRestoreSuccess = (result: RestoreResult) => {
    refreshProgress();
    setLinkedEmail(result.email);
    onRestore('full');
  };

  // Static LANDING_SKILLS entries first (in their declared order, title
  // overridden from the catalog once it resolves), then any catalog row
  // with no static entry at all — a skill that exists purely as a
  // play_curricula insert. getLandingSkill() supplies its generic
  // tracks/illustration fallback for those.
  const staticIds = new Set(LANDING_SKILLS.map((s) => s.id));
  const knownSkills = LANDING_SKILLS.map((skill) => {
    const remoteTitle = catalogRows.find((r) => r.slug === skill.id)?.title;
    return { ...skill, key: skill.id, subtitle: remoteTitle ?? skill.subtitle };
  });
  const dbOnlySkills = catalogRows
    .filter((row) => !staticIds.has(row.slug))
    .map((row) => ({ ...getLandingSkill(row.slug), key: row.slug, subtitle: row.title }));
  const gridSkills = [...knownSkills, ...dbOnlySkills];

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

        {/* Existing user, login link — outside the grid. Hidden once tabs
            are unlocked: AppHeader (shown above this screen in the
            "Skills" tab) already owns identity display, and login/restore
            moves to Settings from there. */}
        {!tabsUnlocked && (
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
        )}

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
