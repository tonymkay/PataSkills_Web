import type { ImageSourcePropType } from 'react-native';
import type { CurriculumSlug } from './curriculumAssets';
import type { Track } from '@/lib/curriculum';

// 'reading' and 'full' are the two universal modes every skill can offer.
// The four role tracks (pairs/names/meanings/whereUsed) are detected
// per-curriculum at runtime instead — see lib/curriculum.ts's
// detectAvailableTracks()/getAvailableTracks(). This alias just names the
// two that are always safe to list as a skill's static fallback below.
export type SimpleTrack = 'reading' | 'full';

// Landing-screen skill catalog. One entry per skill card shown on the
// homepage grid. Adding a skill is just another array entry, matching how
// CurriculumCoverImagePaths already works.
export interface LandingSkill {
  id: CurriculumSlug;
  title: string;
  subtitle: string;
  /** Fallback list shown before getAvailableTracks() resolves, and the
   *  full list for skills with no role-tagged questions to detect (e.g.
   *  world-facts). The real, authoritative list is always the live
   *  per-curriculum detection — this never needs the four role tracks
   *  added manually for driving-theory. */
  tracks: SimpleTrack[];
  /** Optional per-curriculum override of a track's display label —
   *  merged over the shared defaults in constants/trackOptions.ts.
   *  Rendering/components stay untouched; only the copy changes. */
  trackLabels?: Partial<Record<Track, string>>;
  /** Optional per-curriculum override of a track's illustration image —
   *  merged over the shared defaults in constants/trackOptions.ts. */
  trackImages?: Partial<Record<Track, ImageSourcePropType>>;
}

export const LANDING_SKILLS: LandingSkill[] = [
  {
    id: 'driving-theory',
    title: 'Practice over 1000\nhighway code\nquestions',
    subtitle: 'Driving theory',
    tracks: ['reading', 'full'],
  },
  {
    id: 'world-facts',
    title: 'Test yourself with\n150 true or false\nworld facts',
    subtitle: 'World facts',
    tracks: ['full'],
  },
];
