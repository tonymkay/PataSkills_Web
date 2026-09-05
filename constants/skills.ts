import type { CurriculumSlug } from './curriculumAssets';

// The learning-style picker only ever offers these two modes now — the
// old driving-theory-specific pairs/names/meanings/whereUsed tracks are
// no longer surfaced in the UI (see constants/trackOptions.ts). 'reading'
// is a browse-only mode over a skill's signs/image catalog; 'full' is the
// standard question-and-answer quiz over every question in the skill.
export type SimpleTrack = 'reading' | 'full';

// Landing-screen skill catalog. One entry per skill card shown on the
// homepage grid. Adding a skill is just another array entry, matching how
// CurriculumCoverImagePaths already works. `tracks` lists which of the
// two learning-style modes actually have content for this skill — e.g.
// world-facts has no image/signs catalog, so it only offers 'full'.
export interface LandingSkill {
  id: CurriculumSlug;
  title: string;
  subtitle: string;
  tracks: SimpleTrack[];
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
