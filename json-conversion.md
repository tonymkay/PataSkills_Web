# Content JSON Conversion — World Facts Trivia

How `True_False_Trivia_1_0_0.json` (source content export) was converted into
`world-facts.json` (the shape `lib/curriculum.ts`'s `loadRemoteCurriculum()`
actually understands), as a reference for converting future content drops
into new skills. See `CODEBASE.md` §9 (`lib/curriculum.ts`) and §18 (Data
Flow & Architecture) for how the loader and `play_curricula` table work.

## Source shape

The source file is a generic quiz-engine export, not app-native:

```
{
  levels: [
    { id, name, chapters: [
      { id, title, topics: [
        { id, title, questions: [
          { id, rule, type: "single"|"multi", question, explanation,
            options: [ { id, text, correct: boolean }, ... ] }
        ]}
      ]}
    ]}
  ],
  appMeta, country, imageMap, engineRules, learningModes, schemaVersion
}
```

250 questions total, nested four levels deep (level → chapter → topic →
question). None of this structure — levels, chapters, topics, `rule`,
`engineRules`, `learningModes`, `imageMap` — means anything to this app.
Only the question/option content itself carries over.

## Target shape

`loadRemoteCurriculum()` accepts a top-level curriculum object (or legacy bare `QuizQuestion[]` array):

```json
{
  "tracks": [
    {
      "id": "full",
      "title": "All World Facts"
    },
    {
      "id": "nature-trivia",
      "title": "Nature & Animals",
      "filterRole": "nature"
    }
  ],
  "questions": [ ... ],
  "signs": []
}
```

- **`tracks`** *(optional)*: Declares custom learning tracks/modes directly in the JSON (see `types/quiz.ts`'s `CurriculumTrackDefinition`). This allows a curriculum to define its own category names, role/format filters, and presentation modes without changing app code.
- **`questions`**: Array of `QuizQuestion` objects.
- **`signs`**: Array of `SignCatalogEntry` objects. World facts has no image catalog, so the output uses `signs: []` (or omits it).

Each converted question uses the `textChoice` format (plain text options, no images) — supported by `TwoImageCard.tsx`'s `text_only` layout, so no new rendering code is needed:

```json
{
  "id": "l1q001",
  "format": "textChoice",
  "role": "nature",
  "question": "Which statement is true about lions?",
  "answers": ["Lions are big cats", "Lions are reptiles", "Lions live underwater"],
  "correctAnswer": 0,
  "explanation": "",
  "section": "Animals and Nature",
  "topicId": "level1-chapter1-topic1",
  "sequence": 1
}
```

## Field mapping

| Source field | Target field | Notes |
|---|---|---|
| `question.id` | `id` | Kept as-is. All 250 source ids were already globally unique. |
| — | `format` | Hardcoded `"textChoice"` for every question — no source field maps to this, it's what tells `TwoImageCard` to render plain stacked text options instead of image cards. |
| — (or source tag/topic) | `role` | Optional question tag (e.g. `"nature"`, `"history"`, `"science"`). If specified, a custom track in the `"tracks"` array can filter questions with `"filterRole": "<role>"`. |
| `options[].text` (in order) | `answers` | Order preserved — `correctAnswer` is a positional index, not an id, so the option order must not be reshuffled here (the app reshuffles per-attempt at runtime itself, via `shuffleAnswers()` in `CardDeck.tsx`). |
| index of the option where `correct: true` | `correctAnswer` | 0-indexed, per `BaseQuestion.correctAnswer`. |
| `question.explanation` | `explanation` | Passed through. All 250 source explanations were empty strings — harmless, the field is optional. |
| `chapter.title` | `section` | Informational only — nothing in the current app reads `section` for filtering or grouping. Kept for future reference/debugging. |
| `` `${level.id}-${chapter.id}-${topic.id}` `` (generated, not the source's bare `topic.id`) | `topicId` | **Added in the multi-skill architecture fix (2026-09-05).** Globally unique across the whole file — verified with a `Set` check at conversion time, throws on collision. Used by `utils/groupSessions.ts`'s `chunkByTopicBounded()` to group questions into real multi-question sessions for skills with no `pairId` (world-facts and similar), and doubles as the addressable unit for future topic-level deep links (see the multi-skill architecture doc, §A.2/§D.1/§E) — once a `topicId` ships in a live link, treat it as a permanent identifier, not something to regenerate on a later re-conversion. |
| running counter | `sequence` | Global 1-based order across the whole flattened file. Also informational only. |
| `question.rule`, `appMeta`, `country`, `imageMap`, `engineRules`, `learningModes`, `schemaVersion` | *(dropped)* | No equivalent concept in this app's data model. (`level.id`/`topic.id` are no longer fully dropped — see `topicId` above.) |

## The one real incompatibility: multi-select questions

**100 of the 250 source questions were `type: "multi"`** (more than one
`correct: true` option) — e.g. "Which two statements are true about
elephants?" This app's quiz flow has no multi-select mechanic anywhere:
`CheckButton` → `TwoImageCard` → `FeedbackSheet` is built around exactly one
`selectedOption` evaluated against a single `correctAnswer` index
(`types/quiz.ts`'s `BaseQuestion.correctAnswer: number`).

**These 100 questions were excluded from `world-facts.json`, not converted.**
There's no lossless way to force a multi-answer question into a
single-answer shape without changing what the question is actually asking.
`world-facts.json` ships with the remaining **150 single-answer questions**.

If multi-select questions need to ship later, that requires actual app
changes (a `selectedOptions: number[]` variant, a different
`FeedbackSheet`/`CheckButton` evaluation path) — not another JSON
conversion pass. The 100 excluded question ids are reproducible by
re-running the conversion and diffing against the source; they weren't
archived separately.

## Defining Custom Learning Tracks in JSON

Unlike earlier versions of the app where learning modes were hardcoded to driving-theory tracks (`pairs`, `names`, `meanings`, etc.), learning modes can now be declared dynamically per curriculum:

1. **Custom `tracks` header**:
   Add a top-level `"tracks"` array to the JSON. Each entry conforms to:
   ```typescript
   interface CurriculumTrackDefinition {
     id: string;                          // URL & state ID (e.g. "quick-quiz", "image-identification")
     title: string;                       // UI display label (e.g. "Quick Quiz")
     filterRole?: string | string[];      // Matches question.role — pass an array to have one track
                                           // absorb several role values
     filterFormat?: string | string[];    // Matches question.format (e.g. "textChoice") — same array support
     filterTags?: string | string[];      // Matches question.tags — AND-matched (every listed tag must be
                                           // present). The generic filter primitive: use this for any
                                           // learning-mode split that isn't naturally a "role" or "format"
                                           // (difficulty, category, a named learning-mode tag you invent).
                                           // Can combine with filterRole/filterFormat on the same track —
                                           // all present filters must match.
     kind?: 'quiz' | 'reading' | 'full';  // 'quiz' (default, role/format/tags-filtered), 'reading' (see
                                           // below), or 'full' (all questions, standard grouping)
     groupId?: string;                    // Clusters this track with sibling tracks under one shared
                                           // heading in the Learning Style list / mode switcher. Each
                                           // track stays independently addressable regardless.
     groupTitle?: string;                 // Heading shown above a groupId's tracks. Set it on the first
                                           // track in the group; later members can omit it.
     image?: string;                      // Optional custom asset name
   }
   ```
   Confirmed live today: `curricula/questions.sample.json` (driving-theory) ships six explicit
   tracks — `pairs` (`filterRole: "pair"`), `names` (`filterRole: "name"`), `meanings`
   (`filterRole: "meaning"`), `whereUsed` (`filterRole: "whereUsed"`), `reading`
   (`kind: "reading"`), and `full` (`kind: "full"`) — each an independently selectable learning
   style, not merged; `curricula/world-facts.json` ships `full` (`reading` is added
   automatically — see point 2 below). Pushed to the `play-assets` bucket via a one-off script
   — see `scripts/upload-corrected-curriculum.mjs` / `scripts/split-identification-track.mjs`
   for the upload pattern (bucket path + `play_curricula.json_path`, or an in-place overwrite of
   the same path).
2. **`full` and `reading` Are Compulsory**:
   `detectAvailableTracks()` always guarantees a `full` and a `reading` track exist, even if a
   curriculum's `"tracks"` array omits one or both — no author can accidentally ship a skill
   missing either. If omitted, the app synthesizes the default id, resolving its title from
   `play_track_defaults.label` (Supabase, e.g. `full` → `"Learn Full Skill"` as of 2026-09-06)
   before falling back to the hardcoded `DEFAULT_TRACK_LABELS` in `constants/trackOptions.ts` —
   and its image the equivalent DB-then-local chain — unless the skill overrides either via
   `trackLabels`/`trackImages`. Every other declared track is otherwise **automatic
   empty-track elimination**: a track only shows up if there's actually a matching question (or,
   for `kind: "reading"`, a matching entry — see point 4).
3. **No App Code Changes**:
   Adding, renaming, reordering, or grouping tracks in the `"tracks"` array reflects immediately
   in the Learning Style list (`LearningStyleScreen`), Track Detail preview
   (`TrackDetailScreen`), and mid-session Switcher (`ModeSwitcherSheet`) without a new app build.
4. **Reading Mode Is Question-Shape-Aware, and Can Be Scoped**:
   When a skill has no real, hand-authored `signs` catalog (world-facts and any future
   text-only skill), Reading is derived directly from questions
   (`deriveReadingEntriesFromQuestions()` in `utils/hydrateQuestions.ts`) — per question, not a
   fixed schema every question is forced into: an image slot only appears if that question's
   `format` actually carries a hydratable image; a "similar items" section only appears if the
   question shares a real `pairId` with another question; the question's own `explanation`
   merges in below the answer (matching what `LearnMoreSheet` already shows for that question)
   instead of being discarded. A `kind: "reading"` track can declare its own
   `filterRole`/`filterTags` to scope itself to a subset of questions — e.g. a reading mode for
   just one category — purely as a JSON entry, same as any quiz track's filter.

## What conversion does *not* cover

Getting `world-facts.json` (or any converted curriculum) playable end-to-end also needs, outside this JSON transform:

1. **Upload** the file to Storage bucket `play-assets` at some `curricula/`
   path, and **insert a `play_curricula` row** (`slug`, `title`,
   `cover_image_path`, `json_path`, `is_active`) pointing at it — this JSON
   conversion doesn't touch Supabase itself.
2. **`constants/skills.ts`** needs a `LANDING_SKILLS` entry so the skill
   card shows up on the homepage grid, and **`constants/curriculumAssets.ts`**
   needs a matching `CurriculumSlug`/cover-image-path entry (the `id` field
   is typed against that file's keys).
3. **Local Track Fallbacks (optional)**:
   In `constants/skills.ts`, `skill.tracks` provides the synchronous fallback list before runtime network detection resolves (e.g. `tracks: ['full']` for single-track skills). Optional title and illustration overrides can also be specified via `skill.trackLabels` or `skill.trackImages` if needed.

## Bible Trivia (second conversion, 2026-09-06)

A third skill, converted from `Bible_Trivia_1_0_0.json` into `bible-trivia.json` using the
same target shape and field mapping as World Facts above — this section only records what was
*different*, not a full re-explanation of shared rules.

### Source shape differs by one more nesting level and a third question type

```
{
  levels: [
    { id, name, chapters: [
      { id, title, topics: [
        { id, title, questions: [
          { id, rule, type: "single"|"multi"|"matching", question, explanation,
            options: [ { id, text, correct: boolean }, ... ] }
        ]}
      ]}
    ]}
  ],
  appMeta, country, imageMap, engineRules, learningModes, schemaVersion
}
```

395 questions total, nested `level → chapter → topic → question` (one level deeper than World
Facts' `chapter → topic → question` — `topicId` generation therefore uses
`` `${level.id}-${chapter.id}-${topic.id}` ``, same pattern, one more segment).

### The exclusion rule extends to a new type: `matching`

World Facts only had to exclude `multi` (100 of 250 questions). Bible Trivia's source
introduces a third type, `matching` (pair-the-items, no single `correctAnswer` index at all —
not just multiple correct options like `multi`, but a fundamentally different answer shape),
alongside the same `multi` type:

| Source type | Count | Kept? | Why |
|---|---|---|---|
| `single` | 237 | ✅ | Maps directly to `BaseQuestion.correctAnswer: number` |
| `multi` | 79 | ❌ | Same reason as World Facts' exclusion — no multi-select mechanic in the app |
| `matching` | 79 | ❌ | No matching-question UI exists anywhere in the app (`CardDeck.tsx` has no matching-pairs rendering path) — this is a new incompatibility, not a repeat of the `multi` one, but excluded for the same root cause: the app's quiz flow assumes exactly one `correctAnswer` index per question |

**237 of 395 source questions were kept** — same "no lossless single-answer conversion exists"
reasoning as World Facts, just against two excluded types instead of one. If either `multi` or
`matching` questions need to ship later, that's an app change (new answer-evaluation paths in
`CheckButton`/`FeedbackSheet`), not another JSON conversion pass — same conclusion World Facts
already reached.

### An extra constraint World Facts didn't need: no topic goes empty

Because dropping two whole question types out of a topic-nested source risks leaving some
topics with zero (or very few) surviving `single` questions, the conversion verified every one
of the 79 source topics still had **at least 3** kept questions after filtering — none went to
zero. This wasn't a concern for World Facts since only one type (`multi`) was excluded there
and its topics were shallower/less densely populated with multi-type questions.

### No custom `tracks` header — same as World Facts

`bible-trivia.json` ships with no `tracks` array (`{ questions: [...237], signs: [] }`, same
minimal shape as `true-false.json`) — it relies entirely on `full`/`reading` being compulsory
(see the "`full` and `reading` Are Compulsory" section above). If bible-trivia's 79 topics
later warrant their own filterable tracks (e.g. by testament, by book), that's a `tracks` array
addition to the existing JSON, not a re-conversion from source.
