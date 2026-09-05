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

`loadRemoteCurriculum()` accepts either a bare `QuizQuestion[]` array or
`{ questions: QuizQuestion[], signs: SignCatalogEntry[] }` (see `types/quiz.ts`).
World facts has no image catalog, so the output uses the object form with
`signs: []`.

Each converted question uses the `textChoice` format (plain text options,
no images) — already supported by `TwoImageCard.tsx`'s `text_only` layout,
so no new rendering code was needed:

```json
{
  "id": "l1q001",
  "format": "textChoice",
  "question": "Which statement is true about lions?",
  "answers": ["Lions are big cats", "Lions are reptiles", "Lions live underwater"],
  "correctAnswer": 0,
  "explanation": "",
  "section": "Animals and Nature",
  "sequence": 1
}
```

## Field mapping

| Source field | Target field | Notes |
|---|---|---|
| `question.id` | `id` | Kept as-is. All 250 source ids were already globally unique. |
| — | `format` | Hardcoded `"textChoice"` for every question — no source field maps to this, it's what tells `TwoImageCard` to render plain stacked text options instead of image cards. |
| `question.question` | `question` | Unchanged. |
| `options[].text` (in order) | `answers` | Order preserved — `correctAnswer` is a positional index, not an id, so the option order must not be reshuffled here (the app reshuffles per-attempt at runtime itself, via `shuffleAnswers()` in `CardDeck.tsx`). |
| index of the option where `correct: true` | `correctAnswer` | 0-indexed, per `BaseQuestion.correctAnswer`. |
| `question.explanation` | `explanation` | Passed through. All 250 source explanations were empty strings — harmless, the field is optional. |
| `chapter.title` | `section` | Informational only — nothing in the current app reads `section` for filtering or grouping. Kept for future reference/debugging. |
| running counter | `sequence` | Global 1-based order across the whole flattened file. Also informational only. |
| `question.rule`, `level.id`, `topic.id`, `appMeta`, `country`, `imageMap`, `engineRules`, `learningModes`, `schemaVersion` | *(dropped)* | No equivalent concept in this app's data model. |

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

## What conversion does *not* cover

Getting `world-facts.json` playable end-to-end also needs, outside this
JSON transform:

1. **Upload** the file to Storage bucket `play-assets` at some `curricula/`
   path, and **insert a `play_curricula` row** (`slug`, `title`,
   `cover_image_path`, `json_path`, `is_active`) pointing at it — this JSON
   conversion doesn't touch Supabase itself.
2. **`constants/skills.ts`** needs a `LANDING_SKILLS` entry so the skill
   card shows up on the homepage grid, and **`constants/curriculumAssets.ts`**
   needs a matching `CurriculumSlug`/cover-image-path entry (the `id` field
   is typed against that file's keys).
3. **The learning-style track model does not carry over.** `deriveTrack()`
   and `constants/trackOptions.ts`'s six tracks (Differentiate Pairs, Name a
   Sign, Meaning of Signs, Where Signs Are Used, Reading Only, Full Course)
   are driving-theory-specific labels and `role` filters. None of the
   world-facts questions carry a `role`, so only the **`full`** track
   (which just groups everything into sessions of 7, no role filtering)
   actually has content. The other five tracks would render as selectable
   but empty for this skill. Deciding what "learning style" even means for
   a trivia skill — or whether it should skip that screen entirely — is a
   product/design decision, not something this conversion resolves.
