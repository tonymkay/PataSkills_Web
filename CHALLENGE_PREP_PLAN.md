# Challenge Question Prep Plan

## Problem

1. **The countdown is theater, not prep time.** Every challenge type
   (companion, scout, online, tournament) fully resolves its question set
   via `buildChallengeQuestions()` *before* calling `setPendingChallengeRun()`
   and navigating to `/challenge-start`. By the time the "Starting in 8"
   countdown mounts, `pending.questions` is already sitting in memory —
   there is nothing left to prepare. The 8 real seconds on that screen
   currently buy nothing.

2. **Challenge questions never get image-hydrated or prefetched.**
   `buildChallengeQuestions()` (lib/challengeQuestions.ts) calls
   `loadRemoteCurriculum()` directly, which only runs
   `resolvePairedSignImages()` — that resolves the plural `images[]` array
   on two-image-choice questions, but never the singular `image` field.
   Normal-mode questions get that second field resolved by
   `hydrateQuestionsList()` (utils/hydrateQuestions.ts), which challenges
   never call. Result: single-image pairId/signRef questions can get no
   image at all in a challenge, and `TwoImageCard` falls back to a generic
   SVG sign — this is the "wrong/generic sign in challenges" bug already
   on file. Whatever images *do* resolve are never run through
   `Image.prefetch()` the way `lib/imagePrefetch.ts` does for normal runs,
   so the first view of any challenge image is a live network fetch —
   visible pop-in mid-race.

## Context — what already exists to plug into

- **`buildChallengeQuestions()`** (lib/challengeQuestions.ts) is the single
  choke point every challenge type routes through: `challenge-offline.tsx`
  (companion), `challenge-scout-room.tsx` (scout), `challenge-online.tsx`
  (`attemptHandoff`, real online races), and the tournament stage room all
  call it. Fix it once, every mode benefits.
- **`hydrateQuestionsList()`** (utils/hydrateQuestions.ts) already does the
  full image resolution — direct sign-key lookup *and* pairId/signRef —
  that `resolvePairedSignImages()` doesn't cover. It takes
  `(questions, assets, pairs)`, the exact same shape `downloadSession()`
  already builds via `loadSignAssets()` / `loadSignPairs()` (lib/signs.ts).
  Nothing new to write here — challenges just need to call what already
  exists.
- **`prefetchPriorityBatch()` / `backgroundPrefetchSkill()`**
  (lib/imagePrefetch.ts) already block on `Image.prefetch()` for a batch of
  `PlaySession[]`. A challenge race isn't a `PlaySession[]` — it's a flat
  `QuizQuestion[]` — so this needs a thin wrapper, not new prefetch logic.
- **`challenge-start.tsx`** is the "Starting in N" countdown every mode
  already routes through before `/challenge-run`. Companion/scout count
  down locally from mount (`COUNT_FROM = CHALLENGE_COUNTDOWN_SECONDS = 8`);
  online/tournament anchor to `pending.startedAtMs + 8000` (server clock).
  Either way, this screen already exists and already burns ~8s doing
  nothing — it's the resource to repurpose, not a new screen to build.
- **`PendingChallengeRun`** (lib/challengeRuntime.ts) currently requires
  `questions: QuizQuestion[]` fully built before `setPendingChallengeRun()`
  is ever called. To do the prep *during* the countdown, the run needs to
  be storable in an unbuilt "recipe" state first.
- **`BouncingDots`** (components/feedback/DownloadingScreen.tsx) is already
  exported standalone — reusable directly in challenge-start.tsx with no
  new animation code.

## Implementation Plan

### Step 1 — Fix the root cause: hydrate images inside `buildChallengeQuestions()`

This alone fixes the wrong/generic sign bug, independent of everything else
below. Ship this even if nothing else lands today.

```ts
// lib/challengeQuestions.ts
import { loadRemoteCurriculum, deriveTrack } from '@/lib/curriculum';
import { loadSignAssets, loadSignPairs } from '@/lib/signs';
import { hydrateQuestionsList } from '@/utils/hydrateQuestions';

export async function getChallengeTopics(
  slug: CurriculumSlug,
): Promise<{ title: string; questions: QuizQuestion[] }[]> {
  const remote = await loadRemoteCurriculum(slug);
  const hasSigns = remote.signs.length > 0;
  const assets = hasSigns ? await loadSignAssets() : {};
  const pairs = hasSigns ? await loadSignPairs(assets) : {};
  const hydrated = hydrateQuestionsList(remote.questions, assets, pairs);

  const sessions = deriveTrack(hydrated, remote.signs, 'full', remote.tracks);
  return sessions
    .filter((s): s is Extract<typeof s, { kind: 'quiz' }> => s.kind === 'quiz')
    .map((s) => ({ title: s.title, questions: s.questions }));
}
```

`buildChallengeQuestions()` itself is unchanged — it already calls
`getChallengeTopics()` and seed-shuffles the result, so it inherits fully
hydrated `image`/`images` fields for free.

### Step 2 — Add a flat-list prefetch wrapper to `lib/imagePrefetch.ts`

`prefetchUrls()` already exists internally but isn't exported, and every
public entry point takes `PlaySession[]`. Add one small exported function
that works on a flat `QuizQuestion[]` — no new caching logic, it reuses the
same `extractUrls`/`prefetchUrls`/done-set machinery already in the file.

```ts
// lib/imagePrefetch.ts — add near prefetchPriorityBatch()
import type { QuizQuestion } from '@/types/quiz';

/**
 * Prefetches every image referenced by a flat challenge question list
 * (not a PlaySession[] — challenge races never go through session
 * chunking). Scoped per skillId like everything else in this file, so a
 * challenge on driving-theory never touches true-false's done-set.
 */
export async function prefetchChallengeQuestions(
  questions: QuizQuestion[],
  skillId: CurriculumSlug,
): Promise<void> {
  const urls = dedupe(questions.flatMap((q) => [...extractUrls(q.image), ...extractUrls(q.images)]));
  await prefetchUrls(urls, skillId);
}
```

This is intentionally the *blocking* form only (no background continuation)
— a challenge's question set is small (10 questions, not a whole skill), so
there's no "rest of the skill" to sweep in the background the way
`downloadSession()` does.

### Step 3 — Let `PendingChallengeRun` hold a "recipe" before questions exist

`lib/challengeRuntime.ts` currently requires `questions` up front. Make it
optional and add the recipe fields every caller already has in hand
(`curriculumSlug`, `seed`, `questionCount`, `topicIndex`) — this is what
challenge-start.tsx will build from during the countdown.

```ts
// lib/challengeRuntime.ts
export interface PendingChallengeRun {
  challengeId?: string;
  isCompanion?: boolean;
  isScout?: boolean;
  difficulty?: ChallengeDifficulty;
  curriculumSlug: string;
  curriculumTitle: string;
  startedAtMs?: number;
  tournamentId?: string;
  tournamentStage?: number;
  /** Present once buildChallengeQuestions() has actually run. Empty on
   *  first handoff — challenge-start.tsx fills this in during the
   *  countdown via setPendingChallengeRunQuestions(). */
  questions: QuizQuestion[];
  /** Present only until questions is filled in — the recipe
   *  challenge-start.tsx builds the real question set from. */
  seed?: number;
  questionCount?: number;
  topicIndex?: number | null;
  origin: 'challenge-corner' | 'home';
}

export function setPendingChallengeRunQuestions(questions: QuizQuestion[]): void {
  if (!pending) return;
  pending = { ...pending, questions };
}
```

### Step 4 — Rewire the 4 call sites to hand off a recipe, not built questions

Each of `challenge-offline.tsx`, `challenge-scout-room.tsx`,
`challenge-online.tsx` (`attemptHandoff`), and the tournament stage room
currently does: `await buildChallengeQuestions(...)` → check empty →
`setPendingChallengeRun({ ...questions })` → `router.replace('/challenge-start')`.
Change each to skip the await and hand off the recipe immediately:

```ts
// app/challenge-offline.tsx — inside the joinedChallenge effect, replace
// the buildChallengeQuestions() + questions.length check + the
// setPendingChallengeRun call with:
await initCompanionSession(
  joinedChallenge.creatorPersona,
  myDisplayName,
  joinedChallenge.questionCount, // was questions.length — use the recipe's count
  joinedChallenge.waitingCompanions,
);

setPendingChallengeRun({
  isCompanion: true,
  curriculumSlug: joinedChallenge.curriculumSlug,
  curriculumTitle: joinedChallenge.curriculumTitle,
  questions: [],
  seed: joinedChallenge.seed,
  questionCount: joinedChallenge.questionCount,
  topicIndex: joinedChallenge.topicIndex,
  origin: 'challenge-corner',
  difficulty: joinedChallenge.creatorPersona.difficulty,
});
router.replace('/challenge-start');
```

Same shape change applies to `challenge-scout-room.tsx`'s `handoffTimer`
callback and `challenge-online.tsx`'s `attemptHandoff()` (using
`mine.seed` / `mine.questionCount` / `mine.targetTopicCount`, and keeping
`startedAtMs` since online races still need the server-anchored countdown)
— same pattern, same fields, no new concepts.

> Caveat carried into Step 4: `initCompanionSession`/`initScoutSession` take
> the participant/room's *question count*, previously read off the already-
> built `questions.length`. Since the pool can theoretically be smaller
> than `questionCount` (a very short topic), using `joinedChallenge.questionCount`
> directly is a very slight over-estimate in that edge case only — acceptable,
> since `buildChallengeQuestions()` itself already does the same
> `Math.min(count, pool.length)` clamp, and Step 5 reconciles it (see below).

### Step 5 — challenge-start.tsx does the real work during the countdown

This is the core of the plan. On mount, if `pending.questions` is empty,
build + hydrate + prefetch right there, gated so the countdown never
reaches zero before prep is actually done — but never artificially extends
past 8s either, if prep finishes early.

```tsx
// app/challenge-start.tsx
import { useEffect, useState } from 'react';
import {
  getPendingChallengeRun,
  setPendingChallengeRunQuestions,
} from '@/lib/challengeRuntime';
import { buildChallengeQuestions } from '@/lib/challengeQuestions';
import { prefetchChallengeQuestions } from '@/lib/imagePrefetch';
import { BouncingDots } from '@/components/feedback/DownloadingScreen';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

export default function ChallengeStartScreen() {
  // ...existing state...
  const [pending, setPending] = useState(() => getPendingChallengeRun());
  const [prepReady, setPrepReady] = useState(() => (pending?.questions.length ?? 0) > 0);
  const [prepError, setPrepError] = useState<string | null>(null);

  useEffect(() => {
    if (prepReady || !pending || pending.seed === undefined) return;
    let alive = true;
    (async () => {
      try {
        const questions = await buildChallengeQuestions(
          pending.curriculumSlug as CurriculumSlug,
          pending.seed!,
          pending.questionCount!,
          pending.topicIndex,
        );
        if (!alive) return;
        if (questions.length === 0) throw new Error('No questions available for this challenge.');
        await prefetchChallengeQuestions(questions, pending.curriculumSlug as CurriculumSlug);
        if (!alive) return;
        setPendingChallengeRunQuestions(questions);
        setPending(getPendingChallengeRun());
        setPrepReady(true);
      } catch (e) {
        if (alive) setPrepError(e instanceof Error ? e.message : 'Could not prepare this challenge.');
      }
    })();
    return () => { alive = false; };
  }, [pending, prepReady]);

  // proceed() (existing) must gate on prepReady too:
  const proceed = () => {
    if (pending && prepReady) { router.replace('/challenge-run'); return; }
    router.back();
  };

  // Existing tick effects call proceed() once remaining <= 0. Change both
  // (the startTargetMs branch and the local-timer branch) to hold at the
  // last visible second instead of proceeding, until prepReady flips:
  //   if (remaining <= 0) {
  //     if (!prepReady) return; // hold — don't cancel the interval/timeout
  //     cancelled = true;
  //     proceed();
  //   }
  // This means: prep finishes before 8s → countdown just hits 0 and
  // proceeds on schedule, exactly like today. Prep runs long → the number
  // holds at "1" (never shows 0) while BouncingDots communicates why.

  // Render: swap the big countdown number for BouncingDots once count
  // would hit 0 but prep isn't ready yet, and show a retry state on error:
  {prepError ? (
    <>
      <Text style={[Typography.headlineMd, { color: colors.onSurface }]}>Couldn't start challenge</Text>
      <Text style={[Typography.bodyLg, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>{prepError}</Text>
      <Pressable onPress={() => { setPrepError(null); setPending(getPendingChallengeRun()); }}>
        <Text style={{ color: colors.onSurface, textDecorationLine: 'underline' }}>RETRY</Text>
      </Pressable>
    </>
  ) : count <= 1 && !prepReady ? (
    <>
      <Text style={[Typography.headlineXl, { color: colors.onSurfaceVariant }]}>Getting ready</Text>
      <BouncingDots color={colors.tealAccent || '#2BD9C4'} />
    </>
  ) : (
    // existing "Starting in / {count}" render, unchanged
    <>{/* ... */}</>
  )}
}
```

### Step 6 — remove the old silent-failure bailouts

Each of the 4 call sites previously did `if (questions.length === 0) { ...
back out silently }` around their own `buildChallengeQuestions()` call.
Step 4 already removes that call from those screens, so those bailout
branches disappear by construction — failure now surfaces once, in
challenge-start.tsx's `prepError` retry UI (Step 5), instead of being
swallowed differently in four different places.

### Scope discipline

`prefetchChallengeQuestions()` (Step 2) takes `skillId` explicitly and
reuses the same per-skill done-set as everything else in
`imagePrefetch.ts` — a challenge on `driving-theory` never touches
`true-false`'s prefetch state, same guarantee the normal-run prefetch
already has.

### Verification checklist

- [ ] Step 1 alone: manually trigger a companion challenge on a skill with
      single-image pairId/signRef questions — confirm no more generic
      fallback signs.
- [ ] Companion race (`challenge-offline.tsx`) shows dots-then-count if
      network is slow, count-only if fast.
- [ ] Scout race (`challenge-scout-room.tsx`) — same.
- [ ] Online race (`challenge-online.tsx`) — confirm `startedAtMs` anchoring
      still works when prep finishes well before the server-anchored
      target (should just wait, unchanged).
- [ ] **Audit `challenge-tournament-room.tsx`** (not read in this session)
      for the same `buildChallengeQuestions()` → `setPendingChallengeRun()`
      → `/challenge-start` pattern seen in the other 3 screens, and apply
      Step 4's rewrite there too — tournaments route through the same
      `challenge-start.tsx`, so skipping this leaves one mode unfixed.
- [ ] Airplane-mode test: start a companion challenge on a never-played
      skill with no connection — confirm `prepError` + RETRY appears
      instead of a silent bounce back to the challenge list.
