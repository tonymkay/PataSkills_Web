import type { ImageSourcePropType } from 'react-native';
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';
import { LandingSkill, SimpleTrack } from '@/constants/skills';

export interface TrackOption {
  track: SimpleTrack;
  label: string;
  /** Illustration shown in ModeCard rows (LearningStyleScreen /
   *  ModeSwitcherSheet). 'reading' uses a fixed local asset; 'full'
   *  reuses the skill's own remote cover image, since it has no
   *  dedicated local illustration and this keeps working for any
   *  future skill without a new asset. */
  image: ImageSourcePropType;
}

const READING_IMAGE = require('@/assets/driving/reading.webp');

const TRACK_LABELS: Record<SimpleTrack, string> = {
  reading: 'Reading Only',
  full: 'Questions & Answers',
};

/**
 * Builds the learning-style option list for one skill — only the tracks
 * that skill actually lists in `LANDING_SKILLS[].tracks` (see
 * constants/skills.ts). Single source of truth for LearningStyleScreen,
 * TrackDetailScreen, and ModeSwitcherSheet.
 */
export function getTrackOptionsForSkill(skill: LandingSkill): TrackOption[] {
  return skill.tracks.map((track) => ({
    track,
    label: TRACK_LABELS[track],
    image:
      track === 'reading'
        ? READING_IMAGE
        : { uri: getPlayAssetPublicUrl(CurriculumCoverImagePaths[skill.id]) },
  }));
}
