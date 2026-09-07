import { supabase } from '@/lib/supabase';

/**
 * The Help page (Settings → Help). One preset topic list plus a free-form
 * "Something else" — whichever is picked, the same form submits to
 * public.help_requests. Write-only from here: triage happens from the admin.
 */
export type HelpTopic = 'premium' | 'bug' | 'billing' | 'account' | 'content' | 'other';

export interface HelpTopicOption {
  id: HelpTopic;
  label: string;
}

export const HELP_TOPICS: HelpTopicOption[] = [
  { id: 'premium', label: 'Ask about Premium' },
  { id: 'billing', label: 'Payments & billing' },
  { id: 'bug', label: 'Report a bug' },
  { id: 'account', label: 'Account & sign-in' },
  { id: 'content', label: 'A lesson looks wrong' },
  { id: 'other', label: 'Something else' },
];

export interface HelpRequestInput {
  topic: HelpTopic;
  customTopic?: string;
  name: string;
  email?: string;
  message: string;
}

export type HelpRequestResult = 'ok' | 'offline';

/** Submit a Help page message. Best-effort — never throws. */
export async function submitHelpRequest(input: HelpRequestInput): Promise<HelpRequestResult> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;
    const { error } = await supabase.from('help_requests').insert({
      user_id: userId,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      topic: input.topic,
      custom_topic: input.topic === 'other' ? (input.customTopic?.trim() || null) : null,
      message: input.message.trim(),
      app_version: '1.0.0',
    });
    if (error) {
      console.warn('help_requests insert error:', error.message);
    }
    return 'ok';
  } catch {
    return 'ok';
  }
}
