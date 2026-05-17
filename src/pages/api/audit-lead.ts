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
    const { html, text, subject } = renderEmail({ payload, name, email, industry, leadId, dbStatus });

    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: 'Averde AI Audit <mark@averde.ai>',
        to: ['mark@averde.ai'],
        replyTo: email,
        subject,
        html,
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

// ── Email rendering ───────────────────────────────────────────────
const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );

const gradeColor = (grade?: string) => {
  if (!grade) return '#6B7280';
  if (grade.startsWith('A')) return '#16A34A'; // green
  if (grade.startsWith('B')) return '#65A30D'; // lime
  if (grade.startsWith('C')) return '#CA8A04'; // amber
  if (grade.startsWith('D')) return '#EA580C'; // orange
  return '#DC2626';                            // red (F)
};

function renderEmail(args: {
  payload: AuditPayload;
  name: string;
  email: string;
  industry: string;
  leadId: string | null;
  dbStatus: string;
}): { html: string; text: string; subject: string } {
  const { payload, name, email, industry, leadId, dbStatus } = args;
  const s = payload.scores || {};
  const ops = (payload.opportunities || []).slice(0, 3);
  const subject = `Averde AI Audit Lead: ${name || 'Anonymous'} (${industry || 'unknown'})`;

  // — Plain-text fallback (gmail-stripped clients, screenreaders) —
  const textLines = [
    `Name: ${name || '(not given)'}`,
    `Email: ${email}`,
    payload.website ? `Website: ${payload.website}` : '',
    `Industry: ${industry || '(not given)'}`,
    payload.city ? `City: ${payload.city}` : '',
    payload.goal ? `Stated goal: ${payload.goal}` : '',
    '',
    `Overall AI Readiness: ${s.grade ?? '?'} (${s.overall ?? '?'} / 100)`,
    `  AI Search Visibility: ${s.visibility ?? '?'}`,
    `  Stack Maturity:        ${s.stack ?? '?'}`,
    `  Opportunity Density:   ${s.opportunity ?? '?'}`,
    '',
    'Top 3 opportunities:',
    ops.length
      ? ops.map((o, i) => `  ${i + 1}. ${o.title || '(untitled)'}${o.service ? ` — ${o.service}` : ''}`).join('\n')
      : '  (none returned)',
    '',
    leadId ? `Lead row: ${leadId}` : `Supabase: ${dbStatus}`,
  ].filter(Boolean).join('\n');

  // — HTML email (table-based, inline styles, ~600px max-width) —
  const c = {
    ink: '#1F2937',
    muted: '#6B7280',
    bone: '#F4F1EA',
    paper: '#FFFFFF',
    border: '#E5E7EB',
    accent: '#C99356',
    walnut: '#2A1B11',
  };

  const gradeBg = gradeColor(s.grade);
  const scoreCard = (label: string, value: number | string | undefined) => `
    <td style="padding:14px 12px;background:${c.bone};border-radius:8px;text-align:center;width:33%;">
      <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${c.muted};margin-bottom:6px;">${esc(label)}</div>
      <div style="font:700 28px/1 'Helvetica Neue',Arial,sans-serif;color:${c.walnut};">${esc(value ?? '—')}</div>
    </td>`;

  const oppCard = (op: Opportunity, i: number) => `
    <tr><td style="padding:0 0 12px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.paper};border:1px solid ${c.border};border-radius:10px;">
        <tr><td style="padding:18px 20px;">
          <div style="font:600 10px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${c.accent};margin-bottom:4px;">${esc(op.rank || `Opportunity ${i + 1}`)}</div>
          <div style="font:600 17px/1.3 'Helvetica Neue',Arial,sans-serif;color:${c.ink};margin-bottom:8px;">${esc(op.title || '(untitled)')}</div>
          ${op.why ? `<div style="font:400 14px/1.5 'Helvetica Neue',Arial,sans-serif;color:${c.muted};margin-bottom:12px;">${esc(op.why)}</div>` : ''}
          <table role="presentation" cellpadding="0" cellspacing="0" style="font:400 13px/1.4 'Helvetica Neue',Arial,sans-serif;color:${c.ink};">
            ${op.service ? `<tr><td style="padding:2px 16px 2px 0;color:${c.muted};">Service</td><td style="padding:2px 0;">${esc(op.service)}</td></tr>` : ''}
            ${op.effort ? `<tr><td style="padding:2px 16px 2px 0;color:${c.muted};">Timeline</td><td style="padding:2px 0;">${esc(op.effort)}</td></tr>` : ''}
            ${op.invest ? `<tr><td style="padding:2px 16px 2px 0;color:${c.muted};">Investment</td><td style="padding:2px 0;">${esc(op.invest)}</td></tr>` : ''}
          </table>
        </td></tr>
      </table>
    </td></tr>`;

  const identityRow = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:3px 12px 3px 0;color:${c.muted};white-space:nowrap;">${esc(label)}</td><td style="padding:3px 0;color:${c.ink};">${esc(value)}</td></tr>`
      : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${c.bone};font:400 14px/1.5 'Helvetica Neue',Arial,sans-serif;color:${c.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bone};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:${c.paper};border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:24px 28px 16px;background:${c.walnut};color:${c.paper};">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#C99356;margin-bottom:8px;">New audit lead</div>
          <div style="font:600 22px/1.25 'Helvetica Neue',Arial,sans-serif;">${esc(name || 'Anonymous')}</div>
          <div style="font:400 14px/1.4 'Helvetica Neue',Arial,sans-serif;color:#D1D5DB;margin-top:4px;">${esc(industry || 'unknown industry')}${payload.city ? ' · ' + esc(payload.city) : ''}</div>
        </td></tr>

        <!-- Identity -->
        <tr><td style="padding:20px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;">
            ${identityRow('Email', email)}
            ${identityRow('Website', payload.website)}
            ${identityRow('Keywords', payload.keywords)}
            ${identityRow('Stated goal', payload.goal)}
          </table>
        </td></tr>

        <!-- Overall score banner -->
        <tr><td style="padding:8px 28px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${gradeBg};border-radius:10px;">
            <tr>
              <td style="padding:18px 22px;color:#fff;">
                <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.85;">Overall AI Readiness</div>
                <div style="font:700 32px/1.1 'Helvetica Neue',Arial,sans-serif;margin-top:6px;">${esc(s.grade ?? '?')}</div>
              </td>
              <td style="padding:18px 22px;color:#fff;text-align:right;font:700 36px/1 'Helvetica Neue',Arial,sans-serif;">${esc(s.overall ?? '?')}<span style="font-weight:400;font-size:18px;opacity:.7;">/100</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Sub-scores -->
        <tr><td style="padding:12px 28px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6">
            <tr>
              ${scoreCard('AI Search Vis.', s.visibility)}
              ${scoreCard('Stack Maturity', s.stack)}
              ${scoreCard('Opportunity', s.opportunity)}
            </tr>
          </table>
        </td></tr>

        <!-- Opportunities -->
        <tr><td style="padding:8px 28px 16px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${c.muted};margin-bottom:12px;">Top 3 recommended moves</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${ops.length ? ops.map(oppCard).join('') : '<tr><td style="color:' + c.muted + ';">(none returned)</td></tr>'}
          </table>
        </td></tr>

        <!-- Reply nudge -->
        <tr><td style="padding:8px 28px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bone};border-radius:8px;">
            <tr><td style="padding:14px 18px;font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:${c.ink};">
              Reply to this email to respond directly to <strong>${esc(name || email)}</strong> — Reply-To is set.
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer / lead id -->
        <tr><td style="padding:12px 28px 24px;font:400 11px/1.5 'Helvetica Neue',Arial,sans-serif;color:${c.muted};border-top:1px solid ${c.border};">
          ${leadId ? `Supabase row: <code style="font:400 11px/1 ui-monospace,Menlo,monospace;color:${c.ink};">${esc(leadId)}</code>` : `Supabase: ${esc(dbStatus)}`}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  return { html, text: textLines, subject };
}
