import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string; source?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  // Honeypot — real users never fill this.
  if (body.website) return json(200, { ok: true });

  const email = (body.email || '').trim();
  const source = (body.source || 'unknown').trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'invalid_email' });
  }

  // Log to Supabase (table: subscribers — see supabase-subscribers.sql).
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  let logged = false;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await supabase.from('subscribers').insert({ email, source });
      // 23505 = duplicate email; treat as success (they're already subscribed).
      logged = !error || error.code === '23505';
      if (error && error.code !== '23505') console.error('subscribers insert failed:', error.message);
    } catch (err) {
      console.error('subscribers insert threw:', err);
    }
  }

  // Notify Mark — also the fallback if the table doesn't exist yet.
  const resendKey = import.meta.env.RESEND_API_KEY;
  let emailed = false;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: 'Averde AI <mark@averde.ai>',
        to: ['mark@averde.ai'],
        replyTo: email,
        subject: `New subscriber: ${email} (${source})`,
        text: `Email: ${email}\nSource: ${source}\nSupabase: ${logged ? 'logged' : 'not logged'}`,
      });
      emailed = !error;
    } catch (err) {
      console.error('subscriber notify failed:', err);
    }
  }

  if (logged || emailed) return json(200, { ok: true });
  return json(500, { ok: false, error: 'config' });
};
