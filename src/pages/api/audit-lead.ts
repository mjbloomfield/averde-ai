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

type Stack = { productivity?: string; otherTools?: string; customTools?: string };

// Legacy + transitional support for the prior tools-map shape.
type ToolEntry = { selected?: string[]; other?: string; usesAi?: boolean };
type ToolsMap = Record<string, ToolEntry | string | null | undefined>;

type SiteAuditFindings = {
  reachable?: boolean;
  url?: string;
  finalUrl?: string;
  title?: string | null;
  description?: string | null;
  platform?: string | null;
  hosting?: string | null;
  schema?: { present?: string[]; missing?: string[]; typesFound?: string[]; score?: number; max?: number };
  pagespeed?: { performance?: number | null; seo?: number | null; accessibility?: number | null; lcp?: number | null; cls?: number | null } | null;
  files?: { robots?: boolean; sitemap?: boolean };
};

type AiVisibilityResult = {
  configured?: boolean;
  appeared?: boolean;
  industry?: string;
  city?: string;
  userHost?: string | null;
  queries?: Array<{
    query: string;
    appeared: boolean;
    results: Array<{ title: string; url: string; snippet: string; host: string; isUser: boolean }>;
  }>;
};

type Check = {
  id?: string;
  name?: string;
  status?: 'pass' | 'warn' | 'fail' | 'na';
  points?: number;
  max?: number;
  evidence?: string;
  fix?: string;
};

type PlanItem = {
  title?: string;
  why?: string;
  diy?: string[];
  shortcut?: string | null;
};

type AuditPayload = {
  name?: string;
  contactName?: string;
  email?: string;
  website?: string;
  industry?: string;
  city?: string;
  keywords?: string;
  stack?: Stack;
  tools?: ToolsMap; // legacy
  pains?: string[];
  goal?: string;
  scores?: Scores & { earned?: number; possible?: number };
  checks?: Check[];
  actionPlan?: PlanItem[];
  opportunities?: Opportunity[];
  siteAudit?: SiteAuditFindings | null;
  aiVisibility?: AiVisibilityResult | null;
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
          // New shape — stack object goes into tools column as-is (jsonb).
          // The revamped widget no longer asks about tools; the column now
          // carries the contact name so no migration is needed.
          tools: payload.stack ?? payload.tools ?? (payload.contactName ? { contactName: payload.contactName } : {}),
          pains: payload.pains ?? [],
          // Checklist results ride inside the scores jsonb — no migration needed.
          scores: { ...(payload.scores ?? {}), checks: payload.checks ?? undefined },
          opportunities: payload.actionPlan ?? payload.opportunities ?? [],
          site_audit: payload.siteAudit ?? null,
          ai_visibility: payload.aiVisibility ?? null,
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
    const resend = new Resend(resendKey);

    try {
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

    // The user's copy of their report — the audit UI promises this.
    // Best-effort: a failure here shouldn't fail the lead capture.
    try {
      // Store a web copy of the report first so the email can link to it.
      // If storage fails, fall back to sending the email without the link.
      let reportUrl: string | null = null;
      let user = renderUserReportEmail(payload, null);
      if (supabaseUrl && supabaseKey) {
        const reportId = crypto.randomUUID();
        const candidateUrl = `https://averde.ai/audit/report/${reportId}`;
        const candidate = renderUserReportEmail(payload, candidateUrl);
        try {
          const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { error } = await supabase.from('audit_reports').insert({
            id: reportId,
            business_name: payload.name || null,
            contact_name: payload.contactName || null,
            email,
            html: candidate.html,
          });
          if (!error) {
            reportUrl = candidateUrl;
            user = candidate;
          } else {
            console.error('audit_reports insert failed:', error.message);
          }
        } catch (err) {
          console.error('audit_reports insert threw:', err);
        }
      }
      await resend.emails.send({
        from: 'Mark Bloomfield <mark@averde.ai>',
        to: [email],
        replyTo: 'mark@averde.ai',
        subject: user.subject,
        html: user.html,
        text: user.text,
      });
    } catch (err) {
      console.error('user report email failed:', err);
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
  const checksSummary = payload.checks?.length
    ? {
        pass: payload.checks.filter(c => c.status === 'pass').length,
        warn: payload.checks.filter(c => c.status === 'warn').length,
        fail: payload.checks.filter(c => c.status === 'fail').length,
      }
    : null;

  // Stack rows — supports new shape (payload.stack) and legacy (payload.tools map).
  type StackRow = { label: string; value: string };
  const stackRows: StackRow[] = [];
  if (payload.stack) {
    if (payload.stack.productivity) {
      const labelMap: Record<string, string> = {
        google: 'Google Workspace',
        microsoft: 'Microsoft 365',
        mixed: 'Mix of both Google + Microsoft',
        other: 'Neither / something else',
      };
      stackRows.push({ label: 'Productivity', value: labelMap[payload.stack.productivity] || payload.stack.productivity });
    }
    if (payload.stack.otherTools?.trim()) stackRows.push({ label: 'Other tools', value: payload.stack.otherTools.trim() });
    if (payload.stack.customTools?.trim()) stackRows.push({ label: 'Custom tools', value: payload.stack.customTools.trim() });
  } else if (payload.tools) {
    Object.keys(payload.tools).forEach(cat => {
      const e = normalizeToolEntry(payload.tools![cat]);
      const parts = [...e.selected];
      if (parts.includes('Other') && e.other.trim()) {
        parts[parts.indexOf('Other')] = `Other: ${e.other.trim()}`;
      }
      if (parts.length) stackRows.push({ label: cat, value: parts.join(', ') + (e.usesAi ? '  [AI]' : '') });
    });
  }

  // Real findings — site audit
  const sa = payload.siteAudit;
  const siteAuditTextBlock = sa?.reachable
    ? [
        '',
        'Site analysis:',
        sa.platform ? `  Platform: ${sa.platform}` : '',
        sa.hosting ? `  Hosting: ${sa.hosting}` : '',
        `  Schema markup: ${sa.schema?.present?.length ?? 0} of ${sa.schema?.max ?? '?'} expected types`,
        sa.schema?.present?.length ? `    Found: ${sa.schema.present.join(', ')}` : '',
        sa.schema?.missing?.length ? `    Missing: ${sa.schema.missing.join(', ')}` : '',
        sa.pagespeed?.performance != null ? `  PageSpeed mobile performance: ${sa.pagespeed.performance}/100` : '',
        sa.pagespeed?.seo != null ? `  PageSpeed SEO basics: ${sa.pagespeed.seo}/100` : '',
        `  robots.txt: ${sa.files?.robots ? 'present' : 'missing'}  |  sitemap.xml: ${sa.files?.sitemap ? 'present' : 'missing'}`,
      ].filter(Boolean).join('\n')
    : sa
      ? '\nSite analysis: site was not reachable.'
      : '';

  // Real findings — AI search visibility
  const av = payload.aiVisibility;
  const aiVisTextBlock = av?.configured
    ? [
        '',
        `AI search visibility: ${av.appeared ? 'APPEARED in Perplexity search ✓' : 'INVISIBLE to Perplexity ✗'}`,
        av.queries?.[0]?.query ? `  Query: "${av.queries[0].query}"` : '',
        ...(av.queries?.[0]?.results || []).slice(0, 5).map((r) =>
          `  ${r.isUser ? '→ ' : '  '}${r.title}  (${r.host || r.url})`,
        ),
      ].filter(Boolean).join('\n')
    : '';

  const stackTextBlock = stackRows.length
    ? ['', 'Stack:', ...stackRows.map(r => `  ${r.label}: ${r.value}`)].join('\n')
    : '';

  const textLines = [
    `Name: ${name || '(not given)'}`,
    `Email: ${email}`,
    payload.website ? `Website: ${payload.website}` : '',
    `Industry: ${industry || '(not given)'}`,
    payload.city ? `City: ${payload.city}` : '',
    payload.goal ? `Stated goal: ${payload.goal}` : '',
    stackTextBlock,
    siteAuditTextBlock,
    aiVisTextBlock,
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
      ? `<tr><td style="padding:3px 12px 3px 0;color:${c.muted};white-space:nowrap;vertical-align:top;">${esc(label)}</td><td style="padding:3px 0;color:${c.ink};">${esc(value)}</td></tr>`
      : '';

  const toolsHtmlBlock = stackRows.length
    ? `
        <tr><td style="padding:8px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${c.muted};margin-bottom:10px;">Stack</div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;">
            ${stackRows.map(r => `
              <tr>
                <td style="padding:5px 12px 5px 0;color:${c.muted};white-space:nowrap;vertical-align:top;width:32%;">${esc(r.label)}</td>
                <td style="padding:5px 0;color:${c.ink};">${esc(r.value)}</td>
              </tr>
            `).join('')}
          </table>
        </td></tr>`
    : '';

  const siteAuditHtmlBlock = sa
    ? `
        <tr><td style="padding:8px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${c.muted};margin-bottom:10px;">Real site signals</div>
          ${!sa.reachable ? `
            <div style="background:${c.bone};border-left:3px solid ${c.accent};padding:12px 16px;border-radius:6px;color:${c.ink};font-size:13px;">
              Site was not reachable for analysis.
            </div>
          ` : `
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;background:${c.bone};border-radius:8px;">
              <tr>
                <td style="padding:10px 14px;color:${c.muted};width:42%;vertical-align:top;">Schema markup</td>
                <td style="padding:10px 14px;color:${c.ink};">${sa.schema?.present?.length ?? 0} of ${sa.schema?.max ?? '?'} expected${sa.schema?.present?.length ? `<br><span style="color:${c.muted};font-size:12px;">Found: ${esc(sa.schema!.present!.join(', '))}</span>` : ''}${sa.schema?.missing?.length ? `<br><span style="color:#B45309;font-size:12px;">Missing: ${esc(sa.schema!.missing!.join(', '))}</span>` : ''}</td>
              </tr>
              ${sa.platform ? `<tr><td style="padding:10px 14px;color:${c.muted};vertical-align:top;">Platform</td><td style="padding:10px 14px;color:${c.ink};">${esc(sa.platform)}</td></tr>` : ''}
              ${sa.hosting ? `<tr><td style="padding:10px 14px;color:${c.muted};vertical-align:top;">Hosting</td><td style="padding:10px 14px;color:${c.ink};">${esc(sa.hosting)}</td></tr>` : ''}
              ${sa.pagespeed?.performance != null ? `<tr><td style="padding:10px 14px;color:${c.muted};vertical-align:top;">Mobile perf</td><td style="padding:10px 14px;color:${c.ink};">${sa.pagespeed.performance}/100</td></tr>` : ''}
              ${sa.pagespeed?.seo != null ? `<tr><td style="padding:10px 14px;color:${c.muted};vertical-align:top;">SEO basics</td><td style="padding:10px 14px;color:${c.ink};">${sa.pagespeed.seo}/100</td></tr>` : ''}
              <tr><td style="padding:10px 14px;color:${c.muted};vertical-align:top;">Discoverability</td><td style="padding:10px 14px;color:${c.ink};">${sa.files?.robots ? '✓ robots.txt' : '✗ no robots.txt'} &nbsp;·&nbsp; ${sa.files?.sitemap ? '✓ sitemap.xml' : '✗ no sitemap.xml'}</td></tr>
            </table>
          `}
        </td></tr>`
    : '';

  const aiVisHtmlBlock = av?.configured
    ? `
        <tr><td style="padding:8px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${c.muted};margin-bottom:10px;">AI search visibility</div>
          <div style="background:${av.appeared ? '#ECFDF5' : c.walnut};color:${av.appeared ? c.ink : c.paper};border-radius:10px;padding:16px 18px;">
            <div style="font:600 13px/1.2 'Helvetica Neue',Arial,sans-serif;margin-bottom:10px;color:${av.appeared ? '#16A34A' : '#C99356'};">
              ${av.appeared ? '✓ Appeared in Perplexity search' : '⚠ Did NOT appear in Perplexity search'}
            </div>
            ${av.queries?.[0]?.query ? `<div style="font:400 12px/1.4 'Helvetica Neue',Arial,sans-serif;color:${av.appeared ? c.muted : '#D1D5DB'};margin-bottom:10px;">Query: "${esc(av.queries[0].query)}"</div>` : ''}
            ${(av.queries?.[0]?.results || []).slice(0, 5).map(r => `
              <div style="padding:8px 10px;margin-bottom:4px;border-radius:6px;background:${r.isUser ? 'rgba(34,197,94,.18)' : (av.appeared ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.06)')};">
                <div style="font:600 13px/1.3 'Helvetica Neue',Arial,sans-serif;color:${av.appeared ? c.ink : c.paper};">${r.isUser ? '✓ ' : ''}${esc(r.title)}</div>
                <div style="font:400 11px/1.3 'Helvetica Neue',Arial,sans-serif;color:${av.appeared ? c.muted : '#D1D5DB'};margin-top:2px;">${esc(r.host || r.url)}</div>
              </div>
            `).join('')}
          </div>
        </td></tr>`
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
            ${identityRow('Contact', payload.contactName)}
            ${identityRow('Email', email)}
            ${identityRow('Website', payload.website)}
            ${identityRow('Keywords', payload.keywords)}
            ${identityRow('Stated goal', payload.goal)}
          </table>
        </td></tr>

        <!-- Tools / stack -->
        ${toolsHtmlBlock}

        <!-- Real site signals -->
        ${siteAuditHtmlBlock}

        <!-- AI search visibility -->
        ${aiVisHtmlBlock}

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
              ${checksSummary
                ? scoreCard('Checks passed', checksSummary.pass) +
                  scoreCard('Partial', checksSummary.warn) +
                  scoreCard('Failed', checksSummary.fail)
                : scoreCard('AI Search Vis.', s.visibility) +
                  scoreCard('Stack Maturity', s.stack) +
                  scoreCard('Opportunity', s.opportunity)}
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

// ── User-facing report email ─────────────────────────────────────
// A durable copy of what they saw on screen: score, check results,
// action plan, and the booking link. Plain, warm, no tricks.
function renderUserReportEmail(payload: AuditPayload, reportUrl: string | null): { html: string; text: string; subject: string } {
  const s = payload.scores || {};
  const checks = payload.checks || [];
  const plan = payload.actionPlan || [];
  const firstName = (payload.contactName || '').trim().split(/\s+/)[0] || '';
  const business = payload.name || 'your business';
  const subject = `Your Website Audit Report — ${business}`;
  const bookUrl = 'https://averde.ai/ai-audit#book';

  const statusWord: Record<string, string> = { pass: 'PASS', warn: 'PARTIAL', fail: 'FIX', na: 'n/a' };
  const statusColor: Record<string, string> = { pass: '#3a6f4d', warn: '#9C6A33', fail: '#A04324', na: '#B7A990' };

  const textLines = [
    `Hi${firstName ? ' ' + firstName : ''},`,
    '',
    `Here's your Website Audit Report for ${business}.`,
    reportUrl ? `View the full report in your browser: ${reportUrl}` : '',
    '',
    s.overall != null
      ? `Score: ${s.overall}/100 (Grade ${s.grade ?? '?'}) — ${s.earned ?? '?'} of ${s.possible ?? '?'} points across automated checks of your live site and AI-search presence.`
      : 'We couldn\'t run automated site checks (no website provided), so the plan below is based on what you told us.',
    '',
    checks.length ? 'Check results:' : '',
    ...checks.filter(c => c.status !== 'na').map(c => `  [${statusWord[c.status || 'na']}] ${c.name} — ${c.points ?? 0}/${c.max ?? 0} pts`),
    '',
    'Your action plan:',
    ...plan.map((p, i) => [
      `  ${i + 1}. ${p.title}`,
      ...(p.diy || []).map(d => `     - ${d}`),
    ].join('\n')),
    '',
    `Want to walk through it together? Book a free 30-minute review call: ${bookUrl}`,
    '',
    'No pressure either way — everything above is yours to act on.',
    '',
    '— Mark Bloomfield',
    'Averde AI · Boulder, CO · averde.ai',
  ].filter(l => l !== '').join('\n');

  const checkRow = (c: Check) => `
    <tr>
      <td style="padding:7px 10px 7px 0;white-space:nowrap;vertical-align:top;">
        <span style="display:inline-block;font:700 10px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.08em;color:#fff;background:${statusColor[c.status || 'na']};border-radius:99px;padding:4px 8px;">${statusWord[c.status || 'na']}</span>
      </td>
      <td style="padding:7px 0;font:400 14px/1.4 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">${esc(c.name)}
        ${c.status !== 'pass' && c.fix ? `<div style="font:400 12px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-top:2px;">${esc(c.fix)}</div>` : ''}
      </td>
      <td style="padding:7px 0 7px 10px;font:600 12px/1 'Helvetica Neue',Arial,sans-serif;color:#6B7280;white-space:nowrap;text-align:right;vertical-align:top;">${c.status === 'na' ? '' : `${c.points ?? 0}/${c.max ?? 0}`}</td>
    </tr>`;

  const planCard = (p: PlanItem, i: number) => `
    <tr><td style="padding:0 0 12px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;">
        <tr><td style="padding:16px 20px;">
          <div style="font:600 10px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#C99356;margin-bottom:4px;">Priority ${i + 1}</div>
          <div style="font:600 16px/1.3 'Helvetica Neue',Arial,sans-serif;color:#1F2937;margin-bottom:6px;">${esc(p.title)}</div>
          ${p.why ? `<div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-bottom:10px;">${esc(p.why)}</div>` : ''}
          ${(p.diy && p.diy.length) ? `<div style="background:#F4F1EA;border-radius:8px;padding:10px 14px;font:400 13px/1.6 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">${p.diy.map(d => `• ${esc(d)}`).join('<br/>')}</div>` : ''}
        </td></tr>
      </table>
    </td></tr>`;

  const gradeBg = gradeColor(s.grade);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EA;font:400 14px/1.5 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;background:#FFFFFF;border-radius:12px;overflow:hidden;">

        ${reportUrl ? `<tr><td style="padding:10px 28px;background:#EDE3D0;font:400 12px/1.4 'Helvetica Neue',Arial,sans-serif;color:#6B7280;text-align:center;">
          Email clipping this, or reading on a small screen? <a href="${reportUrl}" style="color:#9C6A33;font-weight:600;">View the full report in your browser →</a>
        </td></tr>` : ''}

        <tr><td style="padding:26px 28px 18px;background:#2A1B11;color:#F4ECDB;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#C99356;margin-bottom:8px;">Your Website Audit Report</div>
          <div style="font:600 22px/1.25 'Helvetica Neue',Arial,sans-serif;">${esc(business)}</div>
          ${payload.city || payload.industry ? `<div style="font:400 14px/1.4 'Helvetica Neue',Arial,sans-serif;color:#D1D5DB;margin-top:4px;">${esc(payload.industry || '')}${payload.city ? ' · ' + esc(payload.city) : ''}</div>` : ''}
        </td></tr>

        <tr><td style="padding:22px 28px 6px;font:400 14px/1.6 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">
          Hi${firstName ? ' ' + esc(firstName) : ''} — here's the report you just ran, in full, so you can keep it and act on it. Everything below came from live checks of your actual website and real AI-search queries.
        </td></tr>

        ${s.overall != null ? `
        <tr><td style="padding:14px 28px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${gradeBg};border-radius:10px;">
            <tr>
              <td style="padding:16px 22px;color:#fff;">
                <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.85;">Website Audit Score</div>
                <div style="font:700 30px/1.1 'Helvetica Neue',Arial,sans-serif;margin-top:6px;">Grade ${esc(s.grade ?? '?')}</div>
              </td>
              <td style="padding:16px 22px;color:#fff;text-align:right;font:700 34px/1 'Helvetica Neue',Arial,sans-serif;">${esc(s.overall)}<span style="font-weight:400;font-size:17px;opacity:.7;">/100</span></td>
            </tr>
          </table>
          <div style="font:400 11px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-top:6px;">${esc(String(s.earned ?? '?'))} of ${esc(String(s.possible ?? '?'))} points across automated checks — nothing self-reported is scored.</div>
        </td></tr>` : ''}

        ${checks.filter(c => c.status !== 'na').length ? `
        <tr><td style="padding:16px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:8px;">Check results</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${checks.filter(c => c.status !== 'na').map(checkRow).join('')}
          </table>
        </td></tr>` : ''}

        ${plan.length ? `
        <tr><td style="padding:18px 28px 8px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:10px;">Your action plan — in this order</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${plan.map(planCard).join('')}
          </table>
        </td></tr>` : ''}

        <tr><td style="padding:10px 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;border-radius:10px;">
            <tr><td style="padding:18px 20px;">
              <div style="font:600 15px/1.4 'Helvetica Neue',Arial,sans-serif;color:#1F2937;margin-bottom:6px;">Want a second pair of eyes on this?</div>
              <div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-bottom:14px;">Book a free 30-minute review call — we'll walk through your report and pick the right first move. No pressure either way; everything above is yours to act on.</div>
              <a href="${bookUrl}" style="display:inline-block;background:#2A1B11;color:#F4ECDB;font:600 14px/1 'Helvetica Neue',Arial,sans-serif;padding:12px 22px;border-radius:8px;text-decoration:none;">Book your free review call</a>
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

  return { html, text: textLines, subject };
}
