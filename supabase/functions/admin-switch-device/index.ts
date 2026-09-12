// Supabase Edge Function: admin-switch-device
//
// Moves a device to a different email. Called only from PlayDashboard's
// server-side /api/admin/switch-device route (never from the browser) —
// see DeviceRowActions.tsx -> that route -> here.
//
// The service-role client below uses SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY,
// which Supabase injects into every deployed Edge Function's runtime
// automatically. That key never lives in any repo, .env file, or app
// codebase — this function is the only place it's used for this action.
//
// Deploy:
//   supabase functions deploy admin-switch-device --no-verify-jwt
//   supabase secrets set ADMIN_ACTIONS_SECRET=<same value as PlayDashboard's
//     PLAY_ADMIN_ACTIONS_SECRET env var>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_ACTIONS_SECRET = Deno.env.get('ADMIN_ACTIONS_SECRET') ?? '';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Body {
  deviceId: string;
  newEmail: string;
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
  if (!body.deviceId || !body.newEmail) {
    return new Response(JSON.stringify({ error: 'deviceId and newEmail are required' }), { status: 400 });
  }

  const { error } = await admin
    .from('play_devices')
    .update({ email: body.newEmail, updated_at: new Date().toISOString() })
    .eq('device_id', body.deviceId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  await admin.from('play_device_events').insert({
    device_id: body.deviceId,
    event_type: 'admin_switch_device',
    product_id: body.newEmail,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
