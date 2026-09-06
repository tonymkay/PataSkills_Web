// Landing-illustration cover images, keyed by curriculum slug. Static
// fallback only — the live source of truth is play_curricula.cover_image_path
// via lib/curriculaCatalog.ts, which lets a new skill (new DB row + storage
// upload) show up with no app-code change. This map just covers the instant
// before that fetch resolves, for skills known at build time.
export const CurriculumCoverImagePaths: Record<string, string> = {
  'driving-theory': 'curricula/driving.webp',
  // No cover image uploaded yet for this skill — path is reserved so the
  // slug type-checks; upload a webp to this bucket path (or update this
  // path) before shipping, otherwise the landing card's cover preload
  // silently 404s (LandingIllustration itself won't break, it just won't
  // have a local-fallback style/no zero-latency cover).
  'true-false': 'curricula/true-false.webp',
  'bible-trivia': 'curricula/bible-trivia.webp',
  'world-facts': 'curricula/world-facts.webp',
};

// Opaque skill identifier. Was a closed union (keyof typeof
// CurriculumCoverImagePaths) before the DB-driven catalog (lib/
// curriculaCatalog.ts) existed — widened to string so a skill added purely
// via a play_curricula DB row (no entry in this file or constants/skills.ts)
// still type-checks everywhere it's threaded through.
export type CurriculumSlug = string;

