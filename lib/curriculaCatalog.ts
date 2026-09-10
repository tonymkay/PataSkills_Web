import { supabase } from './supabase';

export interface CurriculumCatalogRow {
  slug: string;
  title: string;
  cover_image_path: string;
}

// Module-level cache — one fetch per app session. Every skill's
// existence, display name, and cover image now lives in this table
// (play_curricula), not in a local constants file, so adding or renaming
// a skill is a DB edit, not a code change. LandingScreen kicks off the
// fetch first in the user flow, but a ?track= deep link can land
// straight on TrackDetailScreen/LearningStyleScreen/ModeSwitcherSheet
// before that — those call getCurriculaCatalog() too, and the in-flight
// promise is shared so it's still only one network round trip.
let cache: CurriculumCatalogRow[] | null = null;
let inflight: Promise<CurriculumCatalogRow[]> | null = null;

export async function getCurriculaCatalog(): Promise<CurriculumCatalogRow[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data, error } = await supabase
          .from('play_curricula')
          .select('slug, title, cover_image_path')
          .eq('is_active', true);
        // Only cache a real result. Caching [] on failure used to make an
        // offline/transient error permanent for the rest of the app
        // session — reconnecting later never retried, since `cache` was
        // already set (truthy) to an empty array. Leaving cache null on
        // failure means the next caller (e.g. a Refresh tap) tries again.
        if (!error && data && data.length > 0) {
          cache = data;
        }
        inflight = null;
        return cache ?? [];
      } catch {
        inflight = null;
        return cache ?? [];
      }
    })();
  }
  return inflight;
}

// Synchronous read of whatever's cached so far — [] before the first
// fetch resolves. Safe to call from render as long as the caller also
// calls getCurriculaCatalog() in an effect to warm/refresh it.
export function getCachedCurricula(): CurriculumCatalogRow[] {
  return cache ?? [];
}

export function getCachedCoverImagePath(slug: string): string | undefined {
  return cache?.find((c) => c.slug === slug)?.cover_image_path;
}

export function getCachedTitle(slug: string): string | undefined {
  return cache?.find((c) => c.slug === slug)?.title;
}
