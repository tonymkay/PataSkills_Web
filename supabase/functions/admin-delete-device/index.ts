// Supabase Edge Function: admin-delete-device
//
// Permanently deletes a single device (and its progress/stats/events/
// question-attempts) via the play_admin_delete_device() SQL function.
// Called only from PlayDashboard's server-side /api/admin/delete-device
// route (never from the browser) — see DeviceRowActions.tsx -> that
// route -> here.
//
// No auth check — deployed --no-verify-jwt, open to anyone who has the
// function URL. Deploy:
//   supabase functions deploy admin-delete-device --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Body {
  deviceId: string;
}

Deno.serve(async (req) => {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (!body.deviceId) {
    return new Response(JSON.stringify({ error: 'deviceId is required' }), { status: 400 });
  }

  const { error } = await admin.rpc('play_admin_delete_device', {
    p_device_id: body.deviceId,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
