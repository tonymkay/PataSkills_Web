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
     id: string;                // URL & state ID (e.g. "quick-quiz", "image-identification")
     title: string;             // UI display label (e.g. "Quick Quiz")
     filterRole?: string;       // Matches question.role
     filterFormat?: string;     // Matches question.format (e.g. "textChoice")
     kind?: 'quiz' | 'reading'; // 'quiz' (default) or 'reading' (chunked signs)
     image?: string;            // Optional custom asset name
   }
   ```
2. **Automatic Empty-Track Elimination**:
   If `"tracks"` is omitted, the app automatically runs dynamic track detection (`detectAvailableTracks()`), ensuring that skills without signs or without certain roles (e.g. `world-facts`) **only show tracks that have actual questions** (e.g. only `full` is displayed; driving-specific tracks like `pairs` or `meanings` are omitted automatically).
3. **No App Code Changes**:
   Adding, renaming, or reordering tracks in the `"tracks"` array will immediately reflect in the Learning Style list (`LearningStyleScreen`), Track Detail preview (`TrackDetailScreen`), and mid-session Switcher (`ModeSwitcherSheet`) without needing a new app build.

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
