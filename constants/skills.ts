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
   *  true-false). The real, authoritative list is always the live
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
    id: 'true-false',
    title: 'Test yourself with\n150 true or false\nquestions',
    subtitle: 'True/False',
    // 'reading' belongs here same as driving-theory's list above: it's
    // unconditionally available for any skill with questions (see
    // detectAvailableTracks() in lib/curriculum.ts), so there's nothing
    // for the live per-curriculum fetch to actually determine here — it
    // was just missing from this static list, which is what made
    // "Reading Only" visibly pop in on LearningStyleScreen after the
    // network round-trip resolved instead of rendering immediately like
    // "All True/False" does.
    tracks: ['reading', 'full'],
  },
  {
    id: 'bible-trivia',
    title: 'Test yourself with\n237 Bible trivia\nquestions',
    subtitle: 'Bible Trivia',
    tracks: ['reading', 'full'],
  },
  {
    id: 'world-facts',
    title: 'Test yourself with\n150 world facts\nquestions',
    subtitle: 'World Facts',
    tracks: ['reading', 'full'],
  },
];

// Generic fallback for any skill that exists only as a play_curricula DB
// row (no entry above) — every skill shipped so far only ever needs
// 'reading' + 'full' (getAvailableTracks()/detectAvailableTracks() layers
// in the four driving-theory role tracks on top of this when a curriculum
// actually has role-tagged questions), so this default is safe for a
// brand-new skill with zero code changes. title/subtitle are blank since
// LandingScreen already overrides subtitle from play_curricula.title —
// this default only exists for its `tracks` fallback and to give
// LearningStyleScreen/ModeSwitcherSheet/TrackDetailScreen something to
// resolve instead of wrongly falling back to LANDING_SKILLS[0]
// (driving-theory)'s track config for a skill that isn't driving-theory.
const DEFAULT_LANDING_SKILL_TRACKS: SimpleTrack[] = ['reading', 'full'];

export function getLandingSkill(id: CurriculumSlug): LandingSkill {
  return (
    LANDING_SKILLS.find((s) => s.id === id) ?? {
      id,
      title: '',
      subtitle: '',
      tracks: DEFAULT_LANDING_SKILL_TRACKS,
    }
  );
}
