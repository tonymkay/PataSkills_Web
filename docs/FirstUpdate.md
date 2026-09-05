# Dynamic Learning Tracks & Visuals Update

## Overview
This update completes the dynamic per-curriculum learning track system, replacing static hardcoded track definitions with runtime detection driven by curriculum question/sign data, while providing customizable labels and illustrations per skill.

---

## 1. Key Changes

### `lib/curriculum.ts`
- **Track Order & Detection**: Maintained `TRACK_ORDER` (`['pairs', 'names', 'meanings', 'whereUsed', 'reading', 'full']`).
- **Data-Driven Availability**: `detectAvailableTracks(questions, signs)` evaluates question roles and sign catalogs.
- **Deduplicated Cache**: `loadCurriculumCached(slug)` ensures a single in-flight / resolved promise shared by `getTrackTotals` and `getAvailableTracks`.

### `constants/skills.ts`
- Added `trackLabels?: Partial<Record<Track, string>>` for per-skill copy customization.
- Added `trackImages?: Partial<Record<Track, ImageSourcePropType>>` for per-skill illustration customization.

### `constants/trackOptions.ts`
- Single source of truth for track labels and visuals:
  - Default labels mapped per track.
  - Default illustrations wired from local assets (`differenciate.webp`, `name.webp`, `meaning.webp`, `usage.webp`, `reading.webp`) and remote fallback for `full`.
  - Skill-level overrides (`trackLabels`, `trackImages`) merged cleanly via `getTrackOptionsForSkill` and `getTrackOption`.

### UI Screens Synchronized
- **`components/landing/LearningStyleScreen.tsx`**:
  - Dynamically fetches available tracks and totals.
  - Added state reconciliation on `skillId` change (`prevSkillId !== skillId`) to eliminate stale-state flash when switching skills.
- **`components/landing/TrackDetailScreen.tsx`**:
  - Migrated from old static `getTrackOptionsForSkill(skill)` to `getTrackOption(skill, effectiveTrack)`.
  - Added `getAvailableTracks(skillId)` verification with graceful fallback if a deep-linked track is unsupported.
  - Wired `loading={isLoadingTracks}` to the CTA button to prevent premature interaction during network resolution.
- **`components/landing/ModeSwitcherSheet.tsx`**:
  - Migrated to `getTrackOptionsForSkill(skill, availableTracks)`.
  - Dynamically detects tracks while guaranteeing `currentTrack` is present to avoid UI flicker.
  - Reconciles state synchronously on `skillId` prop changes.

### `app/index.tsx`
- Validated that `VALID_TRACKS` supports all 6 tracks (`pairs`, `names`, `meanings`, `whereUsed`, `reading`, `full`).

---

## 2. Verification & Architecture Decisions

### Naming Mismatch Resolution (Singular `role` vs. Plural `Track`)
- **Observation**: `Track` keys use plural identifiers (`pairs`, `names`, `meanings`, `whereUsed`), whereas question objects in curriculum JSON specify singular roles (`"pair"`, `"name"`, `"meaning"`, `"whereUsed"`).
- **Decision & Mapping**: `lib/curriculum.ts` explicitly maintains the canonical mapping:
  ```ts
  const TRACK_ROLE: Record<FilterTrack, string> = {
    pairs: 'pair',
    names: 'name',
    meanings: 'meaning',
    whereUsed: 'whereUsed',
  };
  ```
  Both `detectAvailableTracks` and `deriveTrack` query `TRACK_ROLE[track]`, guaranteeing 100% alignment between question filtering and track availability detection.

### Async State & Stale Screen Prevention
- Components initialize available tracks synchronously using `skill.tracks` (fallback) or include `currentTrack` to prevent empty UI flashes.
- To prevent stale tracks from a previously selected skill leaking into intermediate renders when switching skills, each component compares `prevSkillId !== skillId` during render and resets local track state immediately.
- `loadCurriculumCached` deduplicates concurrent network fetches across multiple consumers calling `getTrackTotals` and `getAvailableTracks`.
