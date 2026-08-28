import { supabase } from './supabase';
import { QuizQuestion } from '@/types/quiz';

const DEFAULT_SLUG = 'driving-theory';

interface CurriculumRow {
  slug: string;
  title: string;
  cover_image_path: string | null;
  json_path: string;
}

export interface RemoteCurriculum {
  title: string;
  coverImageUrl: string | null;
  questions: QuizQuestion[];
}

/**
 * Fetches the active curriculum row + its JSON file from Supabase Storage.
 * DB-only: no cache, no local fallback. Throws on any failure — the caller
 * is responsible for surfacing that as a failed download step.
 */
export async function loadRemoteCurriculum(
  slug: string = DEFAULT_SLUG,
): Promise<RemoteCurriculum> {
  const { data: row, error } = await supabase
    .from('play_curricula')
    .select('slug, title, cover_image_path, json_path')
    .eq('slug', slug)
    .eq('is_active', true)
    .single<CurriculumRow>();

  if (error) throw error;
  if (!row) throw new Error(`no active play_curricula row for slug "${slug}"`);

  const { data: jsonPub } = supabase.storage.from('play-assets').getPublicUrl(row.json_path);
  if (!jsonPub?.publicUrl) throw new Error('could not resolve json_path public URL');

  const res = await fetch(jsonPub.publicUrl);
  if (!res.ok) throw new Error(`curriculum fetch failed: ${res.status}`);
  const questions = (await res.json()) as QuizQuestion[];
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('curriculum JSON was empty or malformed');
  }

  const coverImageUrl = row.cover_image_path
    ? supabase.storage.from('play-assets').getPublicUrl(row.cover_image_path).data?.publicUrl ?? null
    : null;

  return { title: row.title, coverImageUrl, questions };
}
