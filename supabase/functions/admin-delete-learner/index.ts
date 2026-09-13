// Supabase Edge Function: admin-delete-learner
//
// Permanently deletes an entire learner via the play_admin_delete_learner()
// SQL function -- either every device linked to an email (plus the
// play_accounts row and play_purchases records) or a single anonymous
// device, depending on isEmail. Called only from PlayDashboard's
// server-side /api/admin/delete-learner route (never from the browser) --
// see LearnerRowActions.tsx -> that route -> here. Same auth/service-role
// pattern as admin-delete-device, admin-merge-devices and
// admin-switch-device.
//
// No auth check — deployed --no-verify-jwt, open to anyone who has the
// function URL. Deploy:
//   supabase functions deploy admin-delete-learner --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface Body {
  id: string;
  isEmail: boolean;
}

Deno.serve(async (req) => {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (!body.id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const { error } = await admin.rpc('play_admin_delete_learner', {
    p_id: body.id,
    p_is_email: !!body.isEmail,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
