import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const prerender = false;

type Dim = { name: string; pts: number; max: number; note: string };
type Move = { id: string; title: string };

type Payload = {
  businessName?: string;
  industry?: string;
  teamSize?: string;
  hours?: Record<string, string>;
  storage?: string;
  platform?: string;
  otherTools?: string;
  usage?: string;
  appetite?: string;
  worry?: string;
  contactName?: string;
  email?: string;
  score?: number;
  dims?: Dim[];
  hoursBack?: number;
  moves?: Move[];
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const gradeOf = (s: number) => (s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : s >= 40 ? 'D' : 'F');
const gradeBg = (g: string) =>
  g === 'A' ? '#16A34A' : g === 'B' ? '#65A30D' : g === 'C' ? '#CA8A04' : g === 'D' ? '#EA580C' : '#DC2626';

function renderUserEmail(p: Payload, reportUrl: string | null) {
  const first = (p.contactName || '').trim().split(/\s+/)[0] || '';
  const business = p.businessName || 'your business';
  const score = p.score ?? 0;
  const g = gradeOf(score);
  const dims = p.dims ?? [];
  const moves = p.moves ?? [];
  const subject = `Your AI Readiness Report — ${business}`;
  const bookUrl = 'https://averde.ai/ai-consulting#book';

  const text = [
    `Hi${first ? ' ' + first : ''},`,
    '',
    `Here's your AI Readiness Report for ${business}.`,
    reportUrl ? `View it in your browser: ${reportUrl}` : '',
    '',
    `Score: ${score}/100 (Grade ${g}) — a structured self-assessment from your answers, not a scan.`,
    p.hoursBack ? `Rough math from your numbers: AI could hand back ~${p.hoursBack} hours a week.` : '',
    '',
    'Dimensions:',
    ...dims.map(d => `  ${d.name}: ${d.pts}/${d.max}`),
    '',
    moves.length ? 'Your top moves:' : '',
    ...moves.map((m, i) => `  ${i + 1}. ${m.title}`),
    '',
    `This report is the prep for your free 30-minute call: ${bookUrl}`,
    '',
    '— Mark Bloomfield',
    'Averde AI · Boulder, CO · averde.ai',
  ].filter(l => l !== '').join('\n');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EA;font:400 14px/1.5 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;background:#FFFFFF;border-radius:12px;overflow:hidden;">
        ${reportUrl ? `<tr><td style="padding:10px 28px;background:#EDE3D0;font:400 12px/1.4 'Helvetica Neue',Arial,sans-serif;color:#6B7280;text-align:center;">
          Reading on a small screen? <a href="${reportUrl}" style="color:#9C6A33;font-weight:600;">View the full report in your browser →</a>
        </td></tr>` : ''}
        <tr><td style="padding:26px 28px 18px;background:#2A1B11;color:#F4ECDB;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#C99356;margin-bottom:8px;">Your AI Readiness Report</div>
          <div style="font:600 22px/1.25 'Helvetica Neue',Arial,sans-serif;">${esc(business)}</div>
          <div style="font:400 14px/1.4 'Helvetica Neue',Arial,sans-serif;color:#D1D5DB;margin-top:4px;">${esc(p.industry || '')}${p.teamSize ? ' · ' + esc(p.teamSize) : ''}</div>
        </td></tr>
        <tr><td style="padding:22px 28px 6px;">
          Hi${first ? ' ' + esc(first) : ''} — here's the report you just ran. It scores your answers (no scan, no made-up numbers), and it's the prep material for your free 30-minute call.
        </td></tr>
        <tr><td style="padding:14px 28px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${gradeBg(g)};border-radius:10px;">
            <tr>
              <td style="padding:16px 22px;color:#fff;">
                <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.85;">AI Readiness Score</div>
                <div style="font:700 30px/1.1 'Helvetica Neue',Arial,sans-serif;margin-top:6px;">Grade ${esc(g)}</div>
              </td>
              <td style="padding:16px 22px;color:#fff;text-align:right;font:700 34px/1 'Helvetica Neue',Arial,sans-serif;">${esc(score)}<span style="font-weight:400;font-size:17px;opacity:.7;">/100</span></td>
            </tr>
          </table>
          ${p.hoursBack ? `<div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#374151;margin-top:10px;"><strong>Rough math from your numbers:</strong> AI could realistically hand back ≈ ${esc(p.hoursBack)} hours a week.</div>` : ''}
        </td></tr>
        <tr><td style="padding:16px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:8px;">The five dimensions</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;">
            ${dims.map(d => `<tr>
              <td style="padding:6px 12px 6px 0;color:#1F2937;">${esc(d.name)}</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;color:#6B7280;white-space:nowrap;">${esc(d.pts)}/${esc(d.max)}</td>
            </tr>`).join('')}
          </table>
        </td></tr>
        ${moves.length ? `<tr><td style="padding:16px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:8px;">Your top moves, in order</div>
          ${moves.map((m, i) => `<div style="font:400 14px/1.6 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">${i + 1}. ${esc(m.title)}</div>`).join('')}
        </td></tr>` : ''}
        <tr><td style="padding:18px 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;border-radius:10px;">
            <tr><td style="padding:18px 20px;">
              <div style="font:600 15px/1.4 'Helvetica Neue',Arial,sans-serif;color:#1F2937;margin-bottom:6px;">This report is the prep for your free call.</div>
              <div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-bottom:14px;">30 minutes, no charge — we walk through your answers and leave you with a plan, whether or not you hire me for any of it.</div>
              <a href="${bookUrl}" style="display:inline-block;background:#2A1B11;color:#F4ECDB;font:600 14px/1 'Helvetica Neue',Arial,sans-serif;padding:12px 22px;border-radius:8px;text-decoration:none;">Book the free 30-minute call</a>
            </td></tr>
          </table>
          <div style="font:400 12px/1.6 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-top:18px;">
            — Mark Bloomfield<br/>Averde AI · Boulder, CO · <a href="https://averde.ai" style="color:#9C6A33;">averde.ai</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}

export const POST: APIRoute = async ({ request }) => {
  let p: Payload;
  try {
    p = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const email = (p.email || '').trim();
  if (!email) return json(400, { ok: false, error: 'missing_email' });

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  let dbStatus: 'inserted' | 'failed' | 'unconfigured' = 'unconfigured';

  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  if (supabase) {
    try {
      const { error } = await supabase.from('readiness_leads').insert({
        business_name: p.businessName || null,
        contact_name: p.contactName || null,
        email,
        industry: p.industry || null,
        team_size: p.teamSize || null,
        hours: p.hours ?? {},
        systems: { storage: p.storage || null, platform: p.platform || null, otherTools: p.otherTools || null },
        ai_usage: p.usage || null,
        appetite: p.appetite || null,
        worry: p.worry || null,
        score: p.score ?? null,
        dims: p.dims ?? [],
        hours_back: p.hoursBack ?? null,
        user_agent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
      });
      dbStatus = error ? 'failed' : 'inserted';
      if (error) console.error('readiness_leads insert failed:', error.message);
    } catch (err) {
      console.error('readiness_leads insert threw:', err);
      dbStatus = 'failed';
    }
  }

  const resendKey = import.meta.env.RESEND_API_KEY;
  let emailStatus: 'sent' | 'failed' | 'config' = 'config';

  if (resendKey) {
    const resend = new Resend(resendKey);

    // Stored web copy first so the email can link to it (same pattern as
    // the website audit; rows live in the shared audit_reports table).
    let reportUrl: string | null = null;
    let user = renderUserEmail(p, null);
    if (supabase) {
      const reportId = crypto.randomUUID();
      const candidateUrl = `https://averde.ai/audit/report/${reportId}`;
      const candidate = renderUserEmail(p, candidateUrl);
      try {
        const { error } = await supabase.from('audit_reports').insert({
          id: reportId,
          business_name: p.businessName || null,
          contact_name: p.contactName || null,
          email,
          html: candidate.html,
        });
        if (!error) {
          reportUrl = candidateUrl;
          user = candidate;
        }
      } catch (err) {
        console.error('readiness report store threw:', err);
      }
    }

    try {
      await resend.emails.send({
        from: 'Mark Bloomfield <mark@averde.ai>',
        to: [email],
        replyTo: 'mark@averde.ai',
        subject: user.subject,
        html: user.html,
        text: user.text,
      });
      emailStatus = 'sent';
    } catch (err) {
      console.error('readiness user email failed:', err);
      emailStatus = 'failed';
    }

    // Internal notification — best-effort.
    try {
      const summary = [
        `Business: ${p.businessName || '?'} (${p.industry || '?'}, ${p.teamSize || '?'})`,
        `Contact: ${p.contactName || '?'} <${email}>`,
        `Score: ${p.score ?? '?'}/100 · Hours back ≈ ${p.hoursBack ?? '?'}h/wk`,
        `AI use: ${p.usage || '?'} · Appetite: ${p.appetite || '?'} · Worry: ${p.worry || '—'}`,
        `Systems: ${p.storage || '?'} / ${p.platform || '?'}${p.otherTools ? ' / ' + p.otherTools : ''}`,
        `Hours: ${Object.entries(p.hours ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}`,
        `Top moves: ${(p.moves ?? []).map(m => m.title).join(' | ') || '—'}`,
        reportUrl ? `Report: ${reportUrl}` : '',
        `Supabase: ${dbStatus}`,
      ].filter(Boolean).join('\n');
      await resend.emails.send({
        from: 'Averde AI Audit <mark@averde.ai>',
        to: ['mark@averde.ai'],
        replyTo: email,
        subject: `Readiness Audit Lead: ${p.businessName || 'Anonymous'} (${p.score ?? '?'}/100)`,
        text: summary,
      });
    } catch (err) {
      console.error('readiness internal email failed:', err);
    }
  }

  if (dbStatus === 'inserted' || emailStatus === 'sent') {
    return json(200, { ok: true, logged: dbStatus === 'inserted', emailed: emailStatus === 'sent' });
  }
  return json(500, { ok: false, error: dbStatus === 'unconfigured' && emailStatus === 'config' ? 'config' : 'send' });
};
