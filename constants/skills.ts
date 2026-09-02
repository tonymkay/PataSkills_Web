import type { CurriculumSlug } from './curriculumAssets';

// Landing-screen skill catalog. One entry per skill card shown on the
// homepage carousel. This app currently ships a single skill
// (driving-theory) — the shape exists so adding a second skill later is
// just another array entry, matching how CurriculumCoverImagePaths already
// works.
export interface LandingSkill {
  id: CurriculumSlug;
  title: string;
  subtitle: string;
}

export const LANDING_SKILLS: LandingSkill[] = [
  {
    id: 'driving-theory',
    title: 'Practice over 1000\nhighway code\nquestions',
    subtitle: 'Driving theory',
  },
];
