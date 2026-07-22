import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const prerender = false;

// Receives the $27 Custom Instructions survey (form POST). Stores the order,
// notifies Mark (who writes the file personally and matches it to the
// payment by email), and confirms to the buyer. Redirects back with ?sent=1.
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const field = (k: string) => String(form.get(k) ?? '').trim();

  // Honeypot: bots fill the hidden website field; humans never see it.
  if (field('website')) return Response.redirect(new URL('/claude-instructions?sent=1', request.url), 303);

  const email = field('email');
  const name = field('name');
  if (!email || !name) return Response.redirect(new URL('/claude-instructions?error=1', request.url), 303);

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await supabase.from('instructions_orders').insert({
        contact_name: name,
        email,
        business: field('business') || null,
        audience: field('audience') || null,
        tone: field('tone') || null,
        tools: field('tools') || null,
        donts: field('donts') || null,
        sample: field('sample') || null,
        notes: field('notes') || null,
        receipt_ref: field('receipt_ref') || null,
      });
      if (error) console.error('instructions_orders insert failed:', error.message);
    } catch (err) {
      console.error('instructions_orders insert threw:', err);
    }
  }

  const resendKey = import.meta.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    try {
      await resend.emails.send({
        from: 'Averde AI Orders <mark@averde.ai>',
        to: ['mark@averde.ai'],
        replyTo: email,
        subject: `$27 Instructions order: ${name}`,
        text: [
          `Name: ${name} <${email}>`,
          `Receipt ref: ${field('receipt_ref') || '—'} (verify payment before fulfilling)`,
          '',
          `Business: ${field('business')}`,
          `Audience: ${field('audience')}`,
          `Tone: ${field('tone')}`,
          `Tools: ${field('tools') || '—'}`,
          `Don'ts: ${field('donts') || '—'}`,
          `Notes: ${field('notes') || '—'}`,
          '',
          'Writing sample:',
          field('sample') || '—',
        ].join('\n'),
      });
    } catch (err) {
      console.error('instructions order internal email failed:', err);
    }
    try {
      await resend.emails.send({
        from: 'Mark Bloomfield <mark@averde.ai>',
        to: [email],
        replyTo: 'mark@averde.ai',
        subject: 'Got your survey — your Custom Instructions file is in the queue',
        text: [
          `Hi ${name.split(/\s+/)[0]},`,
          '',
          "Your survey landed. I write each Instructions file personally from your answers, so it'll arrive in this inbox within 2 business days.",
          '',
          "When it does: paste it into Claude under Settings → General → Instructions for Claude, use it for a week, then reply with anything that feels off — one round of tuning is included.",
          '',
          '— Mark',
          'Averde AI · Boulder, CO · averde.ai',
        ].join('\n'),
      });
    } catch (err) {
      console.error('instructions order confirmation email failed:', err);
    }
  }

  return Response.redirect(new URL('/claude-instructions?sent=1#survey', request.url), 303);
};
