// Supabase Edge Function: admin-merge-devices
//
// Folds an old device's balances/xp/streak/progress onto a new device via
// the play_merge_devices() SQL function, then retires the old device.
// Called only from PlayDashboard's server-side /api/admin/merge-devices
// route (never from the browser) — see DeviceRowActions.tsx -> that
// route -> here.
//
// The service-role client below uses SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY,
// which Supabase injects into every deployed Edge Function's runtime
// automatically. That key never lives in any repo, .env file, or app
// codebase — this function is the only place it's used for this action.
//
// Deploy:
//   supabase functions deploy admin-merge-devices --no-verify-jwt
//   supabase secrets set ADMIN_ACTIONS_SECRET=<same value as PlayDashboard's
//     PLAY_ADMIN_ACTIONS_SECRET env var>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_ACTIONS_SECRET = Deno.env.get('ADMIN_ACTIONS_SECRET') ?? '';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Body {
  oldDeviceId: string;
  newDeviceId: string;
}

Deno.serve(async (req) => {
  if (ADMIN_ACTIONS_SECRET && (req.headers.get('Authorization') ?? '') !== `Bearer ${ADMIN_ACTIONS_SECRET}`) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (!body.oldDeviceId || !body.newDeviceId || body.oldDeviceId === body.newDeviceId) {
    return new Response(
      JSON.stringify({ error: 'oldDeviceId and newDeviceId are required and must differ' }),
      { status: 400 },
    );
  }

  const { error } = await admin.rpc('play_merge_devices', {
    p_old_device_id: body.oldDeviceId,
    p_new_device_id: body.newDeviceId,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
