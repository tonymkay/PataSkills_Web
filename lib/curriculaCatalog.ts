import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isOnline } from './curriculum';

export interface CurriculumCatalogRow {
  slug: string;
  title: string;
  cover_image_path: string;
}

const CATALOG_CACHE_KEY = '@play/curricula_catalog_cache';

async function getPersistedCatalog(): Promise<CurriculumCatalogRow[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurriculumCatalogRow[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function persistCatalog(rows: CurriculumCatalogRow[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(rows));
  } catch {}
}

// Module-level cache — one fetch per app session. Every skill's
// existence, display name, and cover image now lives in this table
// (play_curricula), not in a local constants file, so adding or renaming
// a skill is a DB edit, not a code change. LandingScreen kicks off the
// fetch first in the user flow, but a ?track= deep link can land
// straight on TrackDetailScreen/LearningStyleScreen/ModeSwitcherSheet
// before that — those call getCurriculaCatalog() too, and the in-flight
// promise is shared so it's still only one network round trip.
//
// Also persisted to AsyncStorage (see above) so a DB-only skill (no
// static LANDING_SKILLS entry) still shows up on a cold app start with
// no connection — previously this was in-memory only, so it reset to
// empty on every app restart and any DB-only skill briefly vanished
// until a live fetch succeeded again.
let cache: CurriculumCatalogRow[] | null = null;
let inflight: Promise<CurriculumCatalogRow[]> | null = null;

export async function getCurriculaCatalog(): Promise<CurriculumCatalogRow[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      // Known offline: skip the network attempt entirely and go straight
      // to whatever was persisted from the last successful fetch, rather
      // than waiting for a fetch that's going to fail anyway.
      if (!(await isOnline())) {
        const persisted = await getPersistedCatalog();
        if (persisted) cache = persisted;
        inflight = null;
        return cache ?? [];
      }
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
          void persistCatalog(data);
        } else {
          const persisted = await getPersistedCatalog();
          if (persisted) cache = persisted;
        }
        inflight = null;
        return cache ?? [];
      } catch {
        const persisted = await getPersistedCatalog();
        if (persisted) cache = persisted;
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
