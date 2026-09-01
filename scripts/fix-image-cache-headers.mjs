/**
 * One-time maintenance script: re-uploads every object in the play-assets
 * bucket's `signs/` folder with a long-lived Cache-Control header, so
 * returning users never re-download sign images that never change.
 *
 * Why this exists: Supabase Storage sets Cache-Control from whatever the
 * uploader passes at upload time (default: 1 hour if nothing is passed).
 * The dashboard's "Upload files" button doesn't expose that option, so
 * anything dragged in there is stuck on the 1-hour default. This script
 * downloads each existing object's bytes and re-uploads them to the same
 * path with `cacheControl: '31536000'` (1 year) + `upsert: true`, which
 * overwrites just the metadata Supabase serves — the image bytes and the
 * public URL your app already uses don't change.
 *
 * Safe to re-run; it's idempotent (re-uploading with the same cache
 * setting is a no-op in effect).
 *
 * USAGE (PowerShell, from the play/ directory):
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="paste-the-service-role-key-here"
 *   node scripts/fix-image-cache-headers.mjs
 *
 * The service role key is in Supabase dashboard -> Project Settings -> API
 * -> service_role (secret). NEVER put that key in .env or commit it --
 * it bypasses every RLS policy. Only ever pass it as a shell env var for
 * this one script, in this one terminal session.
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET = 'play-assets';
const FOLDER = 'signs';
const CACHE_CONTROL_SECONDS = '31536000'; // 1 year

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.\n' +
    'See the usage comment at the top of this file.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(FOLDER, { limit: 1000 });

  if (listError) {
    console.error('Failed to list files:', listError.message);
    process.exit(1);
  }

  const imageFiles = (files ?? []).filter((f) => f.name && !f.name.endsWith('/'));
  console.log(`Found ${imageFiles.length} files in ${BUCKET}/${FOLDER}`);

  let succeeded = 0;
  let failed = 0;

  for (const file of imageFiles) {
    const path = `${FOLDER}/${file.name}`;
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(path);

      if (downloadError || !blob) {
        throw downloadError ?? new Error('empty download');
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
          cacheControl: CACHE_CONTROL_SECONDS,
          upsert: true,
          contentType: blob.type || 'image/webp',
        });

      if (uploadError) throw uploadError;

      succeeded += 1;
      console.log(`OK ${path}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${path}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. ${succeeded} updated, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main();
