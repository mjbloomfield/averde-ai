import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const prerender = false;

type Scores = {
  overall?: number;
  grade?: string;
  visibility?: number;
  stack?: number;
  opportunity?: number;
};

type Opportunity = {
  rank?: string;
  title?: string;
  service?: string;
  effort?: string;
  invest?: string;
  why?: string;
};

type AuditPayload = {
  name?: string;
  email?: string;
  website?: string;
  industry?: string;
  city?: string;
  keywords?: string;
  tools?: Record<string, string | null>;
  pains?: string[];
  goal?: string;
  scores?: Scores;
  opportunities?: Opportunity[];
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: AuditPayload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim();
  const industry = (payload.industry || '').trim();

  if (!email) return json(400, { ok: false, error: 'missing_email' });

  // ── 1. Log to Supabase ─────────────────────────────────────────
  // Always log first — that way we have the lead even if email fails.
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  let dbStatus: 'inserted' | 'failed' | 'unconfigured' = 'unconfigured';
  let leadId: string | null = null;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase
        .from('audit_leads')
        .insert({
          name: name || null,
          email,
          website: payload.website || null,
          industry: industry || null,
          city: payload.city || null,
          keywords: payload.keywords || null,
          goal: payload.goal || null,
          tools: payload.tools ?? {},
          pains: payload.pains ?? [],
          scores: payload.scores ?? {},
          opportunities: payload.opportunities ?? [],
          user_agent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        })
        .select('id')
        .single();

      if (error) {
        console.error('audit_leads insert failed:', error.message);
        dbStatus = 'failed';
      } else {
        dbStatus = 'inserted';
        leadId = data?.id ?? null;
      }
    } catch (err) {
      console.error('audit_leads insert threw:', err);
      dbStatus = 'failed';
    }
  }

  // ── 2. Email Mark via Resend ───────────────────────────────────
  const resendKey = import.meta.env.RESEND_API_KEY;
  let emailStatus: 'sent' | 'failed' | 'config' = 'config';
  let emailError: string | null = null;

  if (resendKey) {
    const s = payload.scores || {};
    const ops = (payload.opportunities || []).slice(0, 3);
    const topOps = ops
      .map((o, i) => `  ${i + 1}. ${o.title || '(untitled)'}${o.service ? ` — ${o.service}` : ''}`)
      .join('\n');

    const lines: string[] = [
      `Name: ${name || '(not given)'}`,
      `Email: ${email}`,
      payload.website ? `Website: ${payload.website}` : '',
      `Industry: ${industry || '(not given)'}`,
      payload.city ? `City: ${payload.city}` : '',
      payload.goal ? `Stated goal: ${payload.goal}` : '',
      '',
      `Overall AI Readiness: ${s.grade ?? '?'} (${s.overall ?? '?'} / 100)`,
      `  · AI Search Visibility: ${s.visibility ?? '?'}`,
      `  · Stack Maturity:        ${s.stack ?? '?'}`,
      `  · Opportunity Density:   ${s.opportunity ?? '?'}`,
      '',
      'Top 3 opportunities:',
      topOps || '  (none returned)',
      '',
      leadId ? `Lead row: ${leadId}` : `Logged to Supabase: ${dbStatus}`,
      '',
      '— Full payload below —',
      '',
      JSON.stringify(payload, null, 2),
    ].filter(Boolean);

    const text = lines.join('\n');
    const subject = `Averde AI Audit Lead: ${name || 'Anonymous'} (${industry || 'unknown'})`;

    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: 'Averde AI Audit <mark@averde.ai>',
        to: ['mark@averde.ai'],
        replyTo: email,
        subject,
        text,
      });

      if (error) {
        emailStatus = 'failed';
        emailError = `resend_${error.name || 'error'}: ${error.message || ''}`.trim();
      } else {
        emailStatus = 'sent';
      }
    } catch (err) {
      emailStatus = 'failed';
      emailError = err instanceof Error ? err.message : 'unknown';
    }
  }

  // ── 3. Update lead row with email outcome (best-effort) ────────
  if (leadId && supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase
        .from('audit_leads')
        .update({ email_status: emailStatus, email_error: emailError })
        .eq('id', leadId);
    } catch (err) {
      console.error('audit_leads email-status update failed:', err);
    }
  }

  // ── 4. Respond ─────────────────────────────────────────────────
  // We treat the request as successful if either persistence path worked.
  if (dbStatus === 'inserted' || emailStatus === 'sent') {
    return json(200, {
      ok: true,
      logged: dbStatus === 'inserted',
      emailed: emailStatus === 'sent',
    });
  }

  // Both paths down — return the most actionable error.
  if (dbStatus === 'unconfigured' && emailStatus === 'config') {
    return json(500, { ok: false, error: 'config' });
  }
  return json(500, { ok: false, error: 'send' });
};
