/**
 * Companion Challenge — a fully OFFLINE race against a locally-simulated
 * "bot" opponent. Nothing here touches Supabase: the companion never exists
 * as a row anywhere, it's just a scripted CompanionPlayer participant that
 * ticks through the same question set the learner races, rolling
 * success/failure against its own accuracy stat on a human-like pace.
 * Ported from pataskillsv2's lib/companions.ts — roster, persona shape, and
 * the simulation engine (simulateCompanionRun) are ported verbatim, since
 * none of that touches skill/curriculum data at all.
 *
 * Adapted for Play: pataskillsv2 filters candidate skills by a locally
 * "downloaded" set (lib/skillDownload.ts) and picks a companion weighted by
 * skill-category tag overlap (lib/skillCategories.ts). Play has neither
 * concept — curricula are fetched on demand (lib/curriculaCatalog.ts /
 * lib/curriculum.ts), not pre-downloaded, and play_curricula carries no
 * category. So generateCompanionChallenges() below draws its candidate
 * curricula from getCurriculaCatalog() directly, and pickCompanionForTags
 * is kept (tags param always empty here) purely so the exported roster-pick
 * primitive matches the old app's shape if a category concept is added
 * later — for now every pick is uniform-random.
 *
 * Roster trimmed to the original 6 personas (not the old app's +60 persona
 * expansion) — per the Challenge Corner plan's "keep it lightweight"
 * instruction, a smaller fixed roster is fine to start with.
 */
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import { getChallengeTopics, makeRaceSeed } from '@/lib/challengeQuestions';
import { LANDING_SKILLS } from '@/constants/skills';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

export interface CompanionPlayer {
  deviceId: string;
  displayName: string;
  isCreator: boolean;
  currentQuestionIndex: number;
  finished: boolean;
  score: number;
  total: number;
  timeMs: number;
  finishOrder: number | null;
  rewardKeys: number;
  isBot: boolean;
}

export type CompanionDifficulty = 'easy' | 'medium' | 'hard';

export interface CompanionPersona {
  id: string;
  name: string;
  personality: string;
  /** 0..1 chance the companion answers any given question correctly. */
  accuracy: number;
  /** Average seconds the companion spends per question. */
  paceSeconds: number;
  /** +/- random jitter (seconds) applied to each question's pace. */
  paceJitter: number;
  difficulty: CompanionDifficulty;
  /** Kept for shape-parity with the old app; always [] in Play today since
   *  play_curricula carries no category — see file header. */
  preferredSkillTags: string[];
  copy: {
    invite: string;
    taunt: string;
    congrats: string;
  };
}

/** Every synthetic companion device id carries this prefix so callers can
 *  cheaply tell a bot apart from a real player without a lookup. */
const COMPANION_ID_PREFIX = 'companion-';

export const COMPANION_ROSTER: CompanionPersona[] = [
  {
    id: 'johnny-easy',
    name: 'Johnny Easy',
    personality: 'Laid-back and encouraging — never in a rush.',
    accuracy: 0.55,
    paceSeconds: 7,
    paceJitter: 3,
    difficulty: 'easy',
    preferredSkillTags: ['driving'],
    copy: {
      invite: "Take it easy, I'll go at your pace 😌",
      taunt: 'Oops, missed one — you got this though!',
      congrats: "Nice race! You're getting good at this.",
    },
  },
  {
    id: 'rookie-rob',
    name: 'Rookie Rob',
    personality: "New to everything, genuinely just here to learn.",
    accuracy: 0.5,
    paceSeconds: 8,
    paceJitter: 4,
    difficulty: 'easy',
    preferredSkillTags: [],
    copy: {
      invite: "First time for both of us, let's figure it out!",
      taunt: 'Wait, was that right? Guess not 😅',
      congrats: 'That was fun, want to go again?',
    },
  },
  {
    id: 'ace-amina',
    name: 'Ace Amina',
    personality: 'Competitive but friendly — plays to win.',
    accuracy: 0.68,
    paceSeconds: 5.5,
    paceJitter: 2.5,
    difficulty: 'medium',
    preferredSkillTags: ['sports', 'faith'],
    copy: {
      invite: "Hope you're ready, I don't go easy 🔥",
      taunt: 'Close one — almost had it.',
      congrats: 'Good race! You pushed me the whole way.',
    },
  },
  {
    id: 'coach-zawadi',
    name: 'Coach Zawadi',
    personality: 'Sharp and disciplined — treats every round like training.',
    accuracy: 0.78,
    paceSeconds: 4.5,
    paceJitter: 2,
    difficulty: 'medium',
    preferredSkillTags: ['health', 'finance'],
    copy: {
      invite: 'Focus up, this one counts.',
      taunt: 'Small slip — recalibrating.',
      congrats: "Solid effort. That's how you build the habit.",
    },
  },
  {
    id: 'prof-kimani',
    name: 'Prof. Kimani',
    personality: 'Precise and fast — a genuine expert on the material.',
    accuracy: 0.88,
    paceSeconds: 3.5,
    paceJitter: 1.5,
    difficulty: 'hard',
    preferredSkillTags: ['school', 'finance'],
    copy: {
      invite: 'Let us see what you have learned so far.',
      taunt: 'An uncharacteristic error. Onward.',
      congrats: 'Well reasoned throughout — a worthy race.',
    },
  },
  {
    id: 'nyota',
    name: 'Nyota',
    personality: 'Cool, quick, and quietly brilliant — rarely misses.',
    accuracy: 0.93,
    paceSeconds: 3,
    paceJitter: 1.2,
    difficulty: 'hard',
    preferredSkillTags: ['driving', 'school', 'health', 'finance', 'sports', 'faith'],
    copy: {
      invite: "Let's see if you can keep up ✨",
      taunt: 'Huh. Did not expect to miss that one.',
      congrats: 'Impressive — you kept the pressure on the whole way.',
    },
  },
];

export function getCompanionRoster(): CompanionPersona[] {
  return COMPANION_ROSTER;
}

export function getCompanionPersona(id: string): CompanionPersona | null {
  return COMPANION_ROSTER.find((c) => c.id === id) ?? null;
}

/** True for any device id produced by companionDeviceId — lets run/results
 *  screens branch on "is this player actually a bot" without a lookup. */
export function isCompanionId(deviceId: string): boolean {
  return deviceId.startsWith(COMPANION_ID_PREFIX);
}

/** Stable per-persona device id, so a companion "is" the same CompanionPlayer
 *  identity across a session's progress/finish messages. */
export function companionDeviceId(personaId: string): string {
  return `${COMPANION_ID_PREFIX}${personaId}`;
}

/**
 * Picks a companion for the given skill's category tags, weighted toward
 * personas whose preferredSkillTags overlap — but every companion (including
 * ones with zero overlap) stays in the pool so the race stays a surprise.
 * Falls back to a uniform pick if tags is empty.
 */
export function pickCompanionForTags(tags: string[]): CompanionPersona {
  const roster = getCompanionRoster();
  if (tags.length === 0) return roster[Math.floor(Math.random() * roster.length)];

  const weights = roster.map((c) => {
    const overlap = c.preferredSkillTags.filter((t) => tags.includes(t)).length;
    return 1 + overlap * 3; // baseline weight of 1, tripled per matching tag
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < roster.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return roster[i];
  }
  return roster[roster.length - 1];
}

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

export interface CompanionRunHandle {
  /** Cancels all pending ticks — call on unmount / leave. */
  cancel: () => void;
}

export interface CompanionRunCallbacks {
  onProgress: (currentQuestionIndex: number, liveScore: number) => void;
  /** Fired once the companion has answered every question, OR the shared
   *  race deadline hits first (see `deadlineMs`). */
  onFinish: (result: CompanionPlayer & { isBot: true }) => void;
}

/**
 * Runs a companion through `questionCount` questions on a human-like
 * schedule (paceSeconds ± paceJitter per question), rolling pass/fail
 * against the persona's accuracy for each one, then emits a NearbyPlayer-
 * shaped finish — same shape a real nearby player's `finish` message
 * produces, so results/leaderboard rendering needs no special-casing beyond
 * checking isBot/isCompanionId.
 *
 * `deadlineMs`, when given, is the SAME total race time budget the human is
 * racing against (questionCount * per-question setting — see
 * challenge-run.tsx). Without it a companion always finishes every
 * question no matter how long that takes, so a human who timed out looked
 * inconsistent next to a bot that never could. Whichever happens first —
 * the last question, or the deadline — force-finishes the bot with
 * whatever partial progress/score it has, exactly like onTimeUp does for
 * the human.
 */
export function simulateCompanionRun(
  persona: CompanionPersona,
  questionCount: number,
  callbacks: CompanionRunCallbacks,
  deadlineMs?: number,
): CompanionRunHandle {
  const deviceId = companionDeviceId(persona.id);
  const startedAt = Date.now();
  let answered = 0;
  let score = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  let done = false;

  const finish = () => {
    if (done || cancelled) return;
    done = true;
    if (timer) clearTimeout(timer);
    if (deadlineTimer) clearTimeout(deadlineTimer);
    const timeMs = Date.now() - startedAt;
    callbacks.onFinish({
      deviceId,
      displayName: persona.name,
      isCreator: false,
      currentQuestionIndex: answered,
      finished: true,
      // Raw correct-answer count out of questionCount — same units the
      // human's own score reports (challenge-run.tsx's finishRun), so the
      // leaderboard compares "questions correct" apples-to-apples instead
      // of a points-scaled bot score next to a raw human count.
      score,
      total: questionCount,
      timeMs,
      finishOrder: null, // caller assigns finish order alongside real players
      rewardKeys: 0, // caller assigns reward after ranking (companions never claim their own)
      isBot: true,
    });
  };

  const nextDelayMs = () => {
    const jitter = (Math.random() * 2 - 1) * persona.paceJitter;
    const seconds = Math.max(0.6, persona.paceSeconds + jitter);
    return seconds * 1000;
  };

  const tick = () => {
    if (cancelled || done) return;
    answered += 1;
    if (Math.random() < persona.accuracy) score += 1;
    callbacks.onProgress(answered, score);

    if (answered >= questionCount) {
      finish();
      return;
    }
    timer = setTimeout(tick, nextDelayMs());
  };

  timer = setTimeout(tick, nextDelayMs());
  // Same shared clock the human races against — see doc comment above.
  if (deadlineMs != null) deadlineTimer = setTimeout(finish, deadlineMs);

  return {
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (deadlineTimer) clearTimeout(deadlineTimer);
    },
  };
}

// ---------------------------------------------------------------------------
// Companion-owned Challenge Generation
// ---------------------------------------------------------------------------

export interface CompanionChallenge {
  challengeId: string;
  /** play_curricula.slug — Play's equivalent of the old app's skillId. */
  curriculumSlug: CurriculumSlug;
  curriculumTitle: string;
  topicIndex: number | null;
  topicTitle: string;
  creatorPersona: CompanionPersona;
  waitingCompanions: CompanionPersona[];
  seed: number;
  questionCount: number;
}

/**
 * Generates a list of offline companion-owned challenge cards, drawn from
 * Play's active curricula (getCurriculaCatalog()) rather than a locally
 * downloaded-skill set — Play has no download step to gate on (see file
 * header). Pass `filterSlug` to scope to one curriculum (e.g. when
 * challenge-offline.tsx is entered from a specific curriculum's screen);
 * omitted, candidates are drawn from every active curriculum.
 */
export async function generateCompanionChallenges(
  count = 3,
  filterSlug?: CurriculumSlug,
): Promise<CompanionChallenge[]> {
  const catalog = await getCurriculaCatalog();
  // Offline / network failure: getCurriculaCatalog() resolves to [] and
  // caches that empty result for the rest of the session (see
  // lib/curriculaCatalog.ts), which otherwise made offline companion
  // challenges permanently unavailable — Refresh would just re-hit the
  // same empty cache. Companion races are supposed to work fully offline,
  // so fall back to the static landing catalog (same four skills every
  // build ships with) instead of giving up.
  const catalogOrFallback = catalog.length > 0
    ? catalog
    : LANDING_SKILLS.map((s) => ({ slug: s.id, title: s.subtitle, cover_image_path: '' }));
  const candidates = filterSlug ? catalogOrFallback.filter((c) => c.slug === filterSlug) : catalogOrFallback;
  if (candidates.length === 0) return [];

  const challenges: CompanionChallenge[] = [];
  const roster = getCompanionRoster();

  // Try to generate up to `count` challenges.
  for (let i = 0; i < count * 3; i++) {
    if (challenges.length >= count) break;

    const curriculum = candidates[Math.floor(Math.random() * candidates.length)];
    const topics = await getChallengeTopics(curriculum.slug as CurriculumSlug);
    if (topics.length === 0) continue;

    const topicIndex = Math.floor(Math.random() * topics.length);
    const topic = topics[topicIndex];

    // Avoid duplicate curriculum+topic cards.
    if (challenges.some((c) => c.curriculumSlug === curriculum.slug && c.topicIndex === topicIndex)) {
      continue;
    }

    // No category data on play_curricula (see file header) — uniform pick.
    const creatorPersona = pickCompanionForTags([]);

    // Pick 3-5 waiting companions from remaining roster to ensure 5+ participants (for rewards).
    const remaining = roster.filter((c) => c.id !== creatorPersona.id);
    const waitingCount = Math.floor(Math.random() * 3) + 3; // 3, 4 or 5
    const waitingCompanions: CompanionPersona[] = [];
    const shuffled = [...remaining].sort(() => 0.5 - Math.random());
    for (let w = 0; w < Math.min(waitingCount, shuffled.length); w++) {
      waitingCompanions.push(shuffled[w]);
    }

    challenges.push({
      challengeId: `companion-challenge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      curriculumSlug: curriculum.slug as CurriculumSlug,
      curriculumTitle: curriculum.title,
      topicIndex,
      topicTitle: topic.title,
      creatorPersona,
      waitingCompanions,
      seed: makeRaceSeed(),
      questionCount: 10,
    });
  }

  return challenges;
}
