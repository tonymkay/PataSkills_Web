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
}

const LOCAL_IMAGES: Partial<Record<Track, ImageSourcePropType>> = {
  pairs: require('@/assets/driving/differenciate.webp'),
  names: require('@/assets/driving/name.webp'),
  meanings: require('@/assets/driving/meaning.webp'),
  whereUsed: require('@/assets/driving/usage.webp'),
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
