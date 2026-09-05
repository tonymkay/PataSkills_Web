import type { CurriculumSlug } from './curriculumAssets';

// Landing-screen skill catalog. One entry per skill card shown on the
// homepage carousel. Adding a skill is just another array entry, matching
// how CurriculumCoverImagePaths already works.
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
  {
    id: 'world-facts',
    title: 'Test yourself with\n150 true or false\nworld facts',
    subtitle: 'World facts',
  },
];
