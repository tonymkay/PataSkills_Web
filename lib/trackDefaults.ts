import { supabase, getPlayAssetPublicUrl } from './supabase';

export interface TrackDefaultRow {
  track_id: string;
  image_path: string;
}

// Module-level cache — one fetch per app session, same shared-promise
// shape as curriculaCatalog.ts's getCurriculaCatalog(). Holds the
// UNIVERSAL fallback illustration per standard track (pairs/names/
// meanings/whereUsed/reading today), sourced from play_track_defaults
// so adding/swapping one is a DB + storage edit, not a code change.
// Per-curriculum overrides still come from the curriculum JSON's own
// tracks[].image field (see constants/trackOptions.ts's trackImage()) —
// this cache is only the last DB-driven rung before the local require()
// fallback.
let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

export function getTrackDefaultsCatalog(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = supabase
      .from('play_track_defaults')
      .select('track_id, image_path')
      .then(({ data, error }) => {
        const rows: TrackDefaultRow[] = !error && data ? data : [];
        cache = Object.fromEntries(rows.map((r) => [r.track_id, getPlayAssetPublicUrl(r.image_path)]));
        inflight = null;
        return cache;
      });
  }
  return inflight;
}

// Kick the fetch off as soon as this module is imported (same as
// constants/trackOptions.ts importing it) so it's usually resolved
// before LearningStyleScreen/ModeSwitcherSheet first render.
getTrackDefaultsCatalog();

// Synchronous read of whatever's cached so far — {} before the first
// fetch resolves, in which case trackImage() falls through to the local
// require() fallback for that one render.
export function getCachedTrackDefaultUrl(trackId: string): string | undefined {
  return cache?.[trackId];
}
