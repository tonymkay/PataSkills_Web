import type { ImageSourcePropType } from 'react-native';
import { Track } from '@/lib/curriculum';
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';

export interface TrackOption {
  track: Track;
  label: string;
  /** Illustration shown in ModeSwitcherSheet. Local assets for most
   *  tracks (assets/driving/); 'full' reuses the same remote hero image
   *  as the landing-screen SkillCard for this skill, since it has no
   *  dedicated local asset. */
  image: ImageSourcePropType;
}

/**
 * Single source of truth for the learning-mode list shown in
 * ModeSwitcherSheet. The current track is reordered to the front and
 * highlighted by the sheet itself — there's no separate "current" variant
 * here, just the plain option shown first.
 */
export const TRACK_OPTIONS: TrackOption[] = [
  {
    track: 'pairs',
    label: 'Differentiate Pairs',
    image: require('@/assets/driving/differenciate.webp'),
  },
  {
    track: 'names',
    label: 'Name a sign',
    image: require('@/assets/driving/name.webp'),
  },
  {
    track: 'meanings',
    label: 'Meaning of Signs',
    image: require('@/assets/driving/meaning.webp'),
  },
  {
    track: 'whereUsed',
    label: 'Where signs are used',
    image: require('@/assets/driving/usage.webp'),
  },
  {
    track: 'reading',
    label: 'Reading Only',
    image: require('@/assets/driving/reading.webp'),
  },
  {
    track: 'full',
    label: 'Full Course',
    image: { uri: getPlayAssetPublicUrl(CurriculumCoverImagePaths['driving-theory']) },
  },
];
