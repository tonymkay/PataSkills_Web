import { supabase, getPlayAssetPublicUrl } from './supabase';

export interface TrackDefaultRow {
  track_id: string;
  image_path: string | null;
  label: string | null;
}

interface TrackDefaultsCache {
  images: Record<string, string>;
  labels: Record<string, string>;
}

// Module-level cache — one fetch per app session, same shared-promise
// shape as curriculaCatalog.ts's getCurriculaCatalog(). Holds the
// UNIVERSAL fallback illustration + label per standard track (pairs/
// names/meanings/whereUsed/reading/full today), sourced from
// play_track_defaults so adding/swapping either is a DB edit, not a code
// change. Per-curriculum overrides still come from the curriculum JSON's
// own tracks[].image/title fields (see constants/trackOptions.ts's
// trackImage()/trackLabel()) — this cache is only the last DB-driven rung
// before the hardcoded local fallback.
let cache: TrackDefaultsCache | null = null;
let inflight: Promise<TrackDefaultsCache> | null = null;

export function getTrackDefaultsCatalog(): Promise<TrackDefaultsCache> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    // async IIFE (not a raw .then() chain) so this is a genuine
    // Promise<TrackDefaultsCache> — supabase-js's query builder is only
    // a PromiseLike, and assigning its .then() result straight into a
    // Promise-typed variable doesn't type-check (see the same pre-existing
    // issue in lib/curriculaCatalog.ts).
    inflight = (async () => {
      const { data, error } = await supabase
        .from('play_track_defaults')
        .select('track_id, image_path, label');
      const rows: TrackDefaultRow[] = !error && data ? data : [];
      const images: Record<string, string> = {};
      const labels: Record<string, string> = {};
      for (const r of rows) {
        if (r.image_path) images[r.track_id] = getPlayAssetPublicUrl(r.image_path);
        if (r.label) labels[r.track_id] = r.label;
      }
      cache = { images, labels };
      inflight = null;
      return cache;
    })();
  }
  return inflight;
}

// Kick the fetch off as soon as this module is imported (same as
// constants/trackOptions.ts importing it) so it's usually resolved
// before LearningStyleScreen/ModeSwitcherSheet first render.
getTrackDefaultsCatalog();

// Synchronous reads of whatever's cached so far — undefined before the
// first fetch resolves (or if that track has no DB row), in which case
// trackImage()/trackLabel() fall through to their next fallback for that
// one render.
export function getCachedTrackDefaultUrl(trackId: string): string | undefined {
  return cache?.images[trackId];
}

export function getCachedTrackDefaultLabel(trackId: string): string | undefined {
  return cache?.labels[trackId];
}
