import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, FontFamily } from '@/theme/tokens';
import { SkillGridCard } from './SkillGridCard';
import { SkillGridCardSkeleton } from './SkillGridCardSkeleton';
import { OnboardingStepper } from './OnboardingStepper';
import { LANDING_SKILLS, getLandingSkill } from '@/constants/skills';
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { RestoreResult } from '@/lib/restore';
import { truncateEmailMiddle } from '@/lib/email';
import { getLocalProgress, areTabsUnlocked, syncAllProgressWithCloud } from '@/lib/progress';
import { trackLandingPageSeen } from '@/lib/deviceAnalytics';
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
  /** Optional bottom padding for scroll content (e.g. inside tabbed layout). */
  bottomPadding?: number;
  /** True only on the first-run onboarding funnel (see app/index.tsx's
   *  root gate) — shows the 3-step OnboardingStepper above the heading.
   *  Returning users (tabs already unlocked) never see it. */
  isOnboarding?: boolean;
}

/**
 * Entry screen — 2-column grid of skill cards ("Skills Corner"-style
 * redesign). Tapping a card advances to LearningStyleScreen, where the
 * learner picks a track before download starts. Choosing a different
 * learning mode later (after a topic completes) reuses the same track
 * list via ModeSwitcherSheet — see components/landing/ModeSwitcherSheet.tsx.
 */
export function LandingScreen({ onStart, onRestore, bottomPadding, isOnboarding }: LandingScreenProps) {
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
  // True only until the catalog's first resolution (success or failure) —
  // gates the skeleton grid below. LANDING_SKILLS already renders instantly
  // once this clears, so this never blocks longer than the network call.
  const [catalogLoading, setCatalogLoading] = useState(true);
  // Per-skill { completedTopics, totalTopics }, keyed by skillId — same
  // shape getLocalProgress() returns, same source the Home tab's
  // SkillProgressCard reads. Populated below so this screen's grid cards
  // show the exact same progress as Home for the same skill (previously
  // this screen never read progress at all).
  const [progressMap, setProgressMap] = useState<Record<string, { completedTopics: number; totalTopics: number }>>({});

  useEffect(() => {
    getCurriculaCatalog()
      .then((rows) => setCatalogRows(rows.map((r) => ({ slug: r.slug, title: r.title }))))
      .catch(() => {})
      .finally(() => setCatalogLoading(false));
  }, []);

  const refreshProgress = useCallback(() => {
    // Union of the static fallback list and whatever the catalog has
    // resolved so far — covers both the instant-render skills and any
    // DB-only skill, same id set LandingScreen's grid itself builds below.
    const ids = Array.from(new Set([...LANDING_SKILLS.map((s) => s.id), ...catalogRows.map((r) => r.slug)]));
    Promise.all(ids.map((id) => getLocalProgress(id).then((p) => [id, p] as const)))
      .then((entries) => {
        setProgressMap(
          Object.fromEntries(
            entries.map(([id, p]) => [id, { completedTopics: p.completedTopics, totalTopics: p.totalTopics }])
          )
        );
      })
      .catch(() => {});
  }, [catalogRows]);

  // Re-run once the catalog resolves (DB-only skills aren't in
  // LANDING_SKILLS, so their progress can't be read until their id is
  // known) — mirrors the focus-effect refreshProgress() call below for the
  // static list.
  useEffect(() => {
    if (catalogRows.length > 0) refreshProgress();
  }, [catalogRows, refreshProgress]);

  // Re-reads AsyncStorage progress every time this screen regains focus —
  // not just on first mount. Tabs stay mounted for the app's lifetime
  // under expo-router's <Tabs>, so a topic finished elsewhere (or via
  // this same screen's own flow, then navigated back to) needs a fresh
  // read each time the learner returns here, exactly like Home and
  // Reports already do via their own useFocusEffect calls — previously
  // this screen only ever read progress once, at first mount, so its
  // cards could go stale for the rest of the session.
  useFocusEffect(
    useCallback(() => {
      refreshProgress();
    }, [refreshProgress]),
  );

  useEffect(() => {
    AsyncStorage.getItem('@play/user_email').then((email) => {
      if (email) setLinkedEmail(email);
    }).catch(() => {});
    areTabsUnlocked().then(setTabsUnlocked);
    // Every mount of this screen -- first-ever pre-unlock landing and any
    // later visit to the Skills tab alike -- see docs/device-tracking-plan.md §7.1.
    void trackLandingPageSeen();
  }, []);

  // Auto-restore-on-mount: if this device already has an email linked, pull
  // every known skill's cloud progress in ONE batched query
  // (syncAllProgressWithCloud) rather than one query per skill, and merge
  // max-wins into local storage. Offline-first means no connectivity check
  // is needed here -- the Supabase call inside fails silently and local
  // progress is simply left as-is (see docs/progress-restore-fix-plan.md §4).
  // Waits for the catalog so it restores every current skill, not just the
  // static fallback list; the `didAutoRestore` ref keeps this to once per
  // mount even though catalogRows/linkedEmail can each trigger a re-run.
  const didAutoRestore = useRef(false);
  useEffect(() => {
    if (didAutoRestore.current) return;
    if (!linkedEmail || catalogRows.length === 0) return;
    didAutoRestore.current = true;
    const slugs = catalogRows.map((r) => r.slug);
    syncAllProgressWithCloud(linkedEmail, slugs)
      .then(refreshProgress)
      .catch(() => {});
  }, [linkedEmail, catalogRows]);

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
        contentContainerStyle={[
          styles.containerContent,
          bottomPadding !== undefined && { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {isOnboarding && (
          <View style={styles.stepperWrap}>
            <OnboardingStepper index={0} />
          </View>
        )}

        <Text style={[styles.heading, { color: colors.onSurface }]}>Choose a skill</Text>

        <View style={styles.grid}>
          {catalogLoading
            ? Array.from({ length: LANDING_SKILLS.length }).map((_, i) => <SkillGridCardSkeleton key={i} />)
            : gridSkills.map((skill) => (
                <SkillGridCard
                  key={skill.key}
                  skill={skill}
                  progress={progressMap[skill.key]}
                  onPress={onStart}
                />
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
    paddingTop: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  stepperWrap: {
    marginBottom: Spacing.lg,
  },
  heading: {
    fontFamily: FontFamily.regular,
    fontSize: 28,
    lineHeight: 34,
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
