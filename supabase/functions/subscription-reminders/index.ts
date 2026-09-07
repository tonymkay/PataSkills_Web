// Supabase Edge Function: subscription-reminders
//
// Sends "your Premium renews soon" emails at T-7 days and T-3 days.
//
// Deploy:
//   supabase functions deploy subscription-reminders --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=... EMAIL_FROM="PataSkills <noreply@pataskills.com>" REMINDERS_SECRET=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'PataSkills <noreply@pataskills.com>';
const REMINDERS_SECRET = Deno.env.get('REMINDERS_SECRET') ?? '';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  }).catch(() => null);
  return !!res && res.ok;
}

function body(kind: '7d' | '3d', when: string): { subject: string; html: string } {
  const days = kind === '7d' ? '7 days' : '3 days';
  return {
    subject: `Your PataSkills Premium renews in ${days}`,
    html: `<p>Heads up — your PataSkills Premium subscription renews on <b>${when}</b> (${days} from now).</p>
           <p>No action needed if you want to keep unlimited learning. To change or cancel, open Google Play → Subscriptions, or the app’s Settings.</p>`,
  };
}

Deno.serve(async (req) => {
  if (REMINDERS_SECRET && (req.headers.get('Authorization') ?? '') !== REMINDERS_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  const { data, error } = await admin.rpc('due_subscription_reminders');
  if (error) return new Response(`rpc error: ${error.message}`, { status: 500 });

  let sent = 0;
  for (const row of (data ?? []) as { user_id: string; email: string | null; expires_at: string; kind: '7d' | '3d' }[]) {
    if (!row.email) continue;
    const when = new Date(row.expires_at).toLocaleDateString();
    const { subject, html } = body(row.kind, when);
    const ok = await sendEmail(row.email, subject, html);
    if (ok) {
      await admin.rpc('mark_subscription_reminded', { p_user_id: row.user_id, p_kind: row.kind });
      sent++;
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
