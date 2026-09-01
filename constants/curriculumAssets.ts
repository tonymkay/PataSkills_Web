// Landing-illustration cover images, keyed by curriculum slug. This app
// currently ships a single skill (driving-theory), but the shape here
// mirrors play_curricula's per-row `cover_image_path` column in Supabase
// so adding a second skill later means adding an entry, not new plumbing.
//
// These are static paths (not fetched from the DB) specifically so the
// resulting public URL is knowable at build time — that's what lets
// app/+html.tsx <link rel="preload"> it for web, and what lets the landing
// screen show it with zero network-roundtrip latency before the user has
// even tapped "Start Practice" (loadRemoteCurriculum only runs after that).
export const CurriculumCoverImagePaths = {
  'driving-theory': 'curricula/driving.webp',
} as const;

export type CurriculumSlug = keyof typeof CurriculumCoverImagePaths;
