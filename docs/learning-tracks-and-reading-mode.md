# Learning Tracks & Reading Mode

Status: proposed — not yet built.
Scope: PataSkills Play (`pataproducts/play`).

---

## 1. The Feature (plain English)

### The problem

Right now everyone who opens the app gets the exact same experience: sessions built from the driving-theory sign questions, in the order they happen to sit in the curriculum file. There's no way to point a specific type of learner — or a specific ad campaign — at the type of question that works best for them.

We know from real usage that **"which of these two signs is X" pair-comparison questions convert better** than the rest. Right now that strength is buried — a pair question is just question 1 of 7 in every session, not something a learner can choose to focus on.

Separately, when someone taps **Learn More** on a question today, they get a short, mostly generic explanation. There's an opportunity to make that into something much richer — a real explainer about the sign — and to let people browse those explainers on their own, without needing to answer a question first.

### What we're building

Two related things:

**A. Learning Tracks.** Instead of one fixed curriculum, the same question bank gets served through a few different lenses, and the learner (or a link) picks one:

- **Pairs** — only the "which sign is X" comparison questions. This becomes the *default* — anyone who opens the app with no special link lands here.
- **Names** — only "what is this sign called?" questions.
- **Meanings** — only "what does this sign mean?" questions.
- **Where used** — only "where would you find this sign?" questions.
- **Full course** — today's experience, unchanged: each session is one sign pair, all 7 question types together.

Each of these can also be a **direct link** — so an ad or a campaign can send someone straight into, say, the Pairs track, with no extra tapping.

**B. Reading Mode.** A new way to learn that isn't quiz-based at all: the learner sees a sign, its name, and a real explanation of what it means and where it's used — no question, no answer, just read and move on. This reuses the same "Learn More" content, but lets someone browse it directly as its own mode, and also makes what shows up inside Learn More itself much better.

### What this gets us

- A conversion-optimized entry point (Pairs) for cold traffic and ad campaigns.
- A way to run future campaigns pointed at any specific track via a link, without building anything new each time.
- A foundation (sign categories) for future asks like "warning signs only."
- A genuinely useful, low-pressure way to learn for people who don't want to be quizzed yet.

---

## 2. How This Fits the Current Implementation (technical)

### Current pipeline

```
Supabase play_curricula (one active row, slug "driving-theory")
        │
        ▼
lib/curriculum.ts → loadRemoteCurriculum()
        │  fetches ONE JSON file from Supabase Storage
        ▼
lib/downloadSession.ts → downloadSession()
        │  loads sign image assets + sign pairs, hydrates questions
        ▼
utils/groupSessions.ts → groupQuestionsBySession()
        │  groups the flat question list by pairId → sessions of 7
        ▼
components/play/PlaySession.tsx
        │  renders one session at a time via CardDeck
        ▼
components/cards/CardDeck.tsx
        renders imageChoice (TwoImageCard) / imageTextChoice questions,
        with LearnMoreSheet.tsx as the explainer sheet
```

### Decision: one JSON, derived client-side

We're **not** publishing separate curriculum files per track. There will still be exactly one curriculum JSON, authored once. Tracks are a *filter + regroup* step that runs on-device, right after the existing hydration step and before `groupQuestionsBySession`.

Why: the question bank is small (a few hundred questions), the admin/content pipeline stays exactly as it is today, and adding a new track later is a code change, not a new content export.

### Why this works: the data already has a fixed shape

Every `pairId` group has exactly 7 questions, always in the same role order:

| `sequence` | role | `signRef` |
|---|---|---|
| 1 | Pair comparison | — |
| 2 | Name | B |
| 3 | Meaning | B |
| 4 | Where used | B |
| 5 | Name | A |
| 6 | Meaning | A |
| 7 | Where used | A |

That means every track is a filter on a `role` value — no text-matching, no guessing.

### Session grouping differs by track

- **Full course**: unchanged — `groupQuestionsBySession` still groups by `pairId`, 7 questions per sign pair.
- **Pairs / Names / Meanings / Where used**: filtering to one role leaves 46–92 questions with no natural 7-per-group structure by `pairId` anymore (Pairs = 1 per pairId, the others = 2 per pairId). These need a new grouping function that just chunks the filtered, ordered list into groups of 7 across different signs.

### Reading Mode: a data model gap

Reading Mode needs real, standalone content about *a sign* — not content tied to one specific question's correct answer. Today's `explanation` field is per-question, optional, and unused (0 of 322 sample questions have it set); when empty, the app falls back to a generic templated sentence.

To support both a better Learn More sheet and a standalone Reading Mode, sign-level explainer content needs to be its own thing, decoupled from questions — see the target schema below.

---

## 3. Current JSON Format

One flat array of questions. Confirmed from the sample file (322 questions, 46 sign pairs):

```json
{
  "id": "A1-q1",
  "pairId": "A1",
  "section": "Give Way & Stop",
  "difficulty": "easy",
  "sequence": 1,
  "format": "imageChoice",
  "question": "Which of these two signs means: \"Stop completely, even if the road looks clear, before proceeding\"?",
  "images": [null, null],
  "labels": ["A", "B"],
  "correctAnswer": 1
}
```

```json
{
  "id": "A1-q2",
  "pairId": "A1",
  "section": "Give Way & Stop",
  "difficulty": "easy",
  "sequence": 2,
  "format": "imageTextChoice",
  "signRef": "B",
  "question": "What is this sign called?",
  "answers": ["Stop sign", "Give way sign"],
  "correctAnswer": 0,
  "image": null
}
```

Notes:
- No `explanation` field is populated anywhere in the sample.
- No sign category (regulatory / warning / prohibitory / informational) field exists — it's only implicit in some pair-question wording (e.g. "Which of these two signs is a Regulatory sign?").
- There's no standalone "sign" record — everything is a question.

---

## 4. Targeted JSON Format

Two additions: an explicit `role` on every question (so track filtering doesn't depend on `sequence` position), and a new, separate **signs catalog** that holds the real per-sign content Reading Mode and a better Learn More need.

### 4.1 `role` on every question

```json
{
  "id": "A1-q1",
  "pairId": "A1",
  "role": "pair",
  ...
}
```

`role`: `"pair" | "name" | "meaning" | "whereUsed"`. Same filter as `sequence` today, but explicit and not order-dependent — safer if question ordering ever changes.

### 4.2 A signs catalog (new)

One entry per physical sign (92 entries: A and B for each of the 46 pairs today). This is the content Reading Mode and Learn More pull from.

```json
{
  "signId": "A1-B",
  "pairId": "A1",
  "signRef": "B",
  "name": "Stop sign",
  "signType": "regulatory",
  "meaning": "Stop completely, even if the road looks clear, before proceeding.",
  "whereUsed": "Junctions with poor visibility, uncontrolled intersections, and railway crossings.",
  "explanation": "The stop sign requires a complete stop, not a slow-down — even when the road is visibly clear. It's used at junctions where visibility is limited enough that a rolling stop wouldn't leave a driver enough time to react to approaching traffic.",
  "memoryTip": "Eight-sided shape, red background — the most 'stop everything' sign there is.",
  "relatedSignIds": ["A1-A"],
  "image": null
}
```

Proposed fields, and why each earns its place:

| Field | Purpose |
|---|---|
| `signId` | Stable id for a single physical sign (pairId + signRef). |
| `signType` | Sign category (regulatory / warning / prohibitory / informational / mandatory). Unlocks future "warning signs only" style filtering, independent of track. |
| `name`, `meaning`, `whereUsed` | Same content that today lives split across 3 separate questions — now available as plain facts, not just quiz answers. |
| `explanation` | The real Learn More / Reading Mode paragraph. Replaces the generic fallback text entirely. |
| `memoryTip` | A short mnemonic — genuinely useful for a learning app, cheap to add, and gives Reading Mode cards something with personality beyond a dry fact dump. |
| `relatedSignIds` | Signs commonly confused with this one (e.g. its own pair partner, or a similar-looking sign from another pair). Lets Reading Mode and Learn More surface a "commonly confused with" nudge later. |

`role` and the signs catalog are independent additions — either can ship without the other, but both are needed for Reading Mode specifically.

---

## 5. Implementation Plan

Real, sequential steps. Each is independently shippable and testable before moving to the next.

1. **Add `role` to the curriculum JSON.**
   Authoring-side change: tag every question with its role (`pair` / `name` / `meaning` / `whereUsed`) based on the existing fixed sequence-position mapping. No app code changes yet — this is pure content work on the one JSON file that already exists.

2. **Add `chunkIntoSessions()` to `utils/groupSessions.ts`.**
   New export alongside the existing `groupQuestionsBySession`. Takes an already-filtered, ordered question list and slices it into groups of 7, giving each a synthetic session id/title (e.g. "Pairs — Set 3").

3. **Add `deriveTrack(questions, track)` to `lib/curriculum.ts`.**
   `track: 'pairs' | 'names' | 'meanings' | 'whereUsed' | 'full'`. Filters the flat question list by `role`, then routes to `groupQuestionsBySession` for `'full'` or `chunkIntoSessions` for everything else. Defaults to `'pairs'` when no track is specified.

4. **Thread `track` through the download flow.**
   Read a `track` URL param in `app/index.tsx` (default `'pairs'` when absent — this applies to all traffic, not just new links). Pass it into `downloadSession()` in `lib/downloadSession.ts`, which calls `deriveTrack` on the hydrated questions before handing them to `PlaySession`.

5. **Redesign the landing screen as a track picker.**
   Replace the current single "Start Practice" hero in `components/landing/LandingScreen.tsx` with a short list of entry points — e.g. "Challenge yourself with pairs" (default/first), "Learn sign names", "Learn what signs mean", "Learn where signs are used", "Full course". Tapping one starts that track. If a `track` param is already present in the URL (an ad link), skip the picker and go straight in.

6. **Add the signs catalog to the curriculum JSON.**
   Authoring-side: build the 92-entry signs catalog (Section 4.2) alongside the existing questions array in the same JSON file. This is the content dependency for steps 7–8.

7. **Rebuild Learn More on the signs catalog.**
   Update `components/feedback/LearnMoreSheet.tsx` to look up the relevant sign's catalog entry (via `pairId` + `signRef`) instead of falling back to the generic templated sentence. Drop the fallback template once catalog coverage is complete.

8. **Ship the Reading Card and Reading Mode track.**
   New `components/cards/ReadingCard.tsx` — image, sign name, and explanation, with a "Got it" / "Next" affordance instead of Check/answer. Add `'reading'` as a track option: sessions built directly from the signs catalog (7 signs per session) rather than from questions at all. `CardDeck.tsx` needs a lightweight branch to render `ReadingCard` instead of the quiz card types when running a reading-mode session.

---

## 6. Success Criteria

- Opening the app with no URL parameters starts the **Pairs** track by default — for all traffic, not just new links.
- A direct link with `?track=names` (or `meanings` / `whereUsed` / `full`) skips the picker and starts that track immediately.
- Every track produces sessions of 7 questions, same as today.
- The Full course track is byte-for-byte the same experience as today — no regression for existing users who land there.
- Learn More shows real per-sign content (name, meaning, where used, explanation) instead of the generic fallback sentence, for every sign that has a catalog entry.
- Reading Mode is browsable end-to-end: pick it from the landing picker, page through signs, no questions or scoring involved.
- Admin/content workflow is unchanged except for the one-time addition of `role` and the signs catalog to the existing curriculum JSON — no new Supabase tables, no new `play_curricula` rows.

---

## 7. Affected Files

| File | Change |
|---|---|
| Curriculum JSON (Supabase Storage, `driving-theory` slug) | Add `role` to every question; add the signs catalog |
| `utils/groupSessions.ts` | Add `chunkIntoSessions()` |
| `lib/curriculum.ts` | Add `deriveTrack()` |
| `lib/downloadSession.ts` | Accept and pass through a `track` param |
| `app/index.tsx` | Read `track` from the URL, default to `'pairs'` |
| `components/landing/LandingScreen.tsx` | Replace hero CTA with the track picker |
| `components/feedback/LearnMoreSheet.tsx` | Pull explanation from the signs catalog instead of the generic fallback |
| `components/cards/ReadingCard.tsx` | New — the reading-mode card |
| `components/cards/CardDeck.tsx` | Branch to render `ReadingCard` for reading-mode sessions |
| `types/quiz.ts` | Add `role` to `BaseQuestion`; add a `SignCatalogEntry` type |
