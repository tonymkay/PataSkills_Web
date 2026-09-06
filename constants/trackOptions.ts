import type { ImageSourcePropType } from 'react-native';
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';
import { LandingSkill } from '@/constants/skills';
import { Track, StandardTrack } from '@/lib/curriculum';
import { CurriculumTrackDefinition } from '@/types/quiz';

export interface TrackOption {
  track: Track;
  label: string;
  /** Illustration shown in ModeCard rows (LearningStyleScreen /
   *  ModeSwitcherSheet) and TrackDetailScreen's preview. The four
   *  driving-theory role tracks and 'reading' use fixed local assets;
   *  'full' reuses the skill's own remote cover image, since it has no
   *  dedicated local illustration and this keeps working for any future
   *  skill without a new asset. */
  image: ImageSourcePropType;
  /** JSON-declared clustering — see CurriculumTrackDefinition.groupId. */
  groupId?: string;
  groupTitle?: string;
}

/** One heading + its tracks, for rendering a grouped list. Groups with
 *  only one member render with no heading (groupTitle omitted) so a
 *  lone track never gets a redundant header above it. */
export interface TrackOptionGroup {
  groupTitle?: string;
  options: TrackOption[];
}

/**
 * Clusters a flat TrackOption list by groupId, preserving first-seen
 * order for both groups and options within them — ungrouped options each
 * become their own singleton group (no heading). Pure list-rendering
 * concern: doesn't touch addressing, totals, or session derivation.
 */
export function groupTrackOptions(options: TrackOption[]): TrackOptionGroup[] {
  const groups: TrackOptionGroup[] = [];
  const groupIndex = new Map<string, number>();

  for (const option of options) {
    if (!option.groupId) {
      groups.push({ options: [option] });
      continue;
    }
    const existingIndex = groupIndex.get(option.groupId);
    if (existingIndex === undefined) {
      groupIndex.set(option.groupId, groups.length);
      groups.push({ groupTitle: option.groupTitle, options: [option] });
    } else {
      groups[existingIndex].options.push(option);
    }
  }

  // A group with only one member after all is said and done doesn't need
  // a heading — it reads the same as an ungrouped row.
  return groups.map((g) => (g.options.length > 1 ? g : { options: g.options }));
}

// Keyed by the driving-theory curriculum's JSON-declared track ids
// (data/questions.sample.json's "tracks" array) plus the two universal
// tracks. If a curriculum declares a track id not listed here (or a
// legacy pre-consolidation id like the old 'pairs'/'names'/'meanings'/
// 'whereUsed'), trackImage() below falls back to the skill's remote
// cover image — never a crash, just a less-distinct icon.
const LOCAL_IMAGES: Partial<Record<Track, ImageSourcePropType>> = {
  differentiation: require('@/assets/driving/differenciate.webp'),
  identification: require('@/assets/driving/name.webp'),
  reading: require('@/assets/driving/reading.webp'),
};

// Shared default label per track. A skill can override any of these via
// LandingSkill.trackLabels (constants/skills.ts) or directly inside
// the curriculum JSON without forking this file or any component.
const DEFAULT_TRACK_LABELS: Record<StandardTrack, string> = {
  pairs: 'Differentiate Pairs',
  names: 'Name a Sign',
  meanings: 'Meaning of Signs',
  whereUsed: 'Where Signs Are Used',
  reading: 'Reading Only',
  full: 'Questions & Answers',
};

function trackImage(
  skill: LandingSkill,
  track: Track,
  customTrackDef?: CurriculumTrackDefinition,
): ImageSourcePropType {
  if (customTrackDef?.image) {
    if (customTrackDef.image.startsWith('http://') || customTrackDef.image.startsWith('https://')) {
      return { uri: customTrackDef.image };
    }
  }
  return (
    skill.trackImages?.[track] ??
    LOCAL_IMAGES[track] ?? { uri: getPlayAssetPublicUrl(CurriculumCoverImagePaths[skill.id]) }
  );
}

function trackLabel(
  skill: LandingSkill,
  track: Track,
  customTrackDef?: CurriculumTrackDefinition,
): string {
  return (
    skill.trackLabels?.[track] ??
    customTrackDef?.title ??
    DEFAULT_TRACK_LABELS[track as StandardTrack] ??
    (typeof track === 'string' ? track : 'Practice')
  );
}

/**
 * Builds the learning-style option list for one skill, for whichever
 * tracks the caller passes in — normally the live result of
 * getAvailableTracks()/detectAvailableTracks() (lib/curriculum.ts), not a
 * hand-written list. Single source of truth for LearningStyleScreen and
 * ModeSwitcherSheet's row rendering.
 */
export function getTrackOptionsForSkill(
  skill: LandingSkill,
  tracks: Track[],
  customTrackDefs?: CurriculumTrackDefinition[],
): TrackOption[] {
  return tracks.map((track) => {
    const customDef = customTrackDefs?.find((d) => d.id === track);
    return {
      track,
      label: trackLabel(skill, track, customDef),
      image: trackImage(skill, track, customDef),
      groupId: customDef?.groupId,
      groupTitle: customDef?.groupTitle,
    };
  });
}

/**
 * Single-track lookup for screens that already know which track they're
 * showing (TrackDetailScreen) — doesn't depend on the detected-tracks
 * list resolving first, so a `?track=pairs`-style deep link renders the
 * right label/image immediately instead of racing getAvailableTracks().
 */
export function getTrackOption(
  skill: LandingSkill,
  track: Track,
  customTrackDefs?: CurriculumTrackDefinition[] | CurriculumTrackDefinition,
): TrackOption {
  const customDef = Array.isArray(customTrackDefs)
    ? customTrackDefs.find((d) => d.id === track)
    : customTrackDefs;
  return {
    track,
    label: trackLabel(skill, track, customDef),
    image: trackImage(skill, track, customDef),
  };
}
