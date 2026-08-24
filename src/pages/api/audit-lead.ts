import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const prerender = false;

type Half = { earned: number; possible: number; pct: number };

type Scores = {
  overall?: number;
  grade?: string;
  halves?: { search?: Half | null; ai?: Half | null };
  visibility?: number;
  stack?: number;
  opportunity?: number;
};

type Opportunity = {
  rank?: string;
  kind?: 'fix' | 'rec';
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
  searchScope?: string[];
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
  const scopeLabel = (scope?: string[]) => {
    const local = scope?.includes('local'), national = scope?.includes('national');
    if (local && national) return 'Near them and nationwide';
    if (national) return 'Nationwide';
    return local ? 'Near them' : '';
  };
  const allOps = payload.opportunities || [];
  const fixes = allOps.filter(o => o.kind !== 'rec');
  const recs = allOps.filter(o => o.kind === 'rec');
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
    `Overall: ${s.grade ?? '?'} (${s.overall ?? '?'} / 100)`,
    s.halves?.search ? `  Search basics: ${s.halves.search.pct}/100` : '',
    s.halves?.ai ? `  AI readiness:  ${s.halves.ai.pct}/100` : '',
    '',
    'Priority fixes:',
    fixes.length
      ? fixes.map((o, i) => `  ${i + 1}. ${o.title || '(untitled)'}${o.service ? ` — ${o.service}` : ''}`).join('\n')
      : '  (none returned)',
    recs.length ? '' : '',
    recs.length ? 'Recommendations:' : '',
    recs.length
      ? recs.map((o, i) => `  ${i + 1}. ${o.title || '(untitled)'}${o.service ? ` — ${o.service}` : ''}`).join('\n')
      : '',
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

  // The internal notification is the client's report verbatim, with a
  // lead-only block bolted on top. One canonical report, no drift.
  const report = renderUserReportEmail(payload, null);

  const infoRow = (label: string, value?: string) => value
    ? `<tr><td style="padding:5px 14px 5px 0;color:${c.muted};vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:5px 0;color:${c.ink};">${esc(value)}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${c.bone};font:400 14px/1.5 'Helvetica Neue',Arial,sans-serif;color:${c.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bone};padding:24px 12px;">
    <tr><td align="center">

      <table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;background:${c.paper};border-radius:12px;overflow:hidden;margin-bottom:18px;">
        <tr><td style="padding:22px 28px 16px;background:${c.walnut};color:${c.paper};">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${c.accent};margin-bottom:8px;">New audit lead</div>
          <div style="font:600 21px/1.25 'Helvetica Neue',Arial,sans-serif;">${esc(name || 'Anonymous')}</div>
          <div style="font:400 14px/1.4 'Helvetica Neue',Arial,sans-serif;color:#D1D5DB;margin-top:4px;">${esc(industry || 'unknown')}${payload.city ? ' · ' + esc(payload.city) : ''}</div>
        </td></tr>

        <tr><td style="padding:18px 28px 6px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;">
            ${infoRow('Contact', payload.contactName)}
            ${infoRow('Email', email)}
            ${infoRow('Website', payload.website)}
            ${infoRow('Searching from', scopeLabel(payload.searchScope))}
            ${infoRow('Stated goal', payload.goal)}
            ${infoRow('Platform', sa?.platform || undefined)}
            ${infoRow('Hosting', sa?.hosting || undefined)}
            ${infoRow('Pages scanned', sa?.schema?.pagesScanned?.length ? String(sa.schema.pagesScanned.length) : undefined)}
            ${checksSummary ? `<tr><td style="padding:5px 14px 5px 0;color:${c.muted};vertical-align:top;white-space:nowrap;">Checks</td><td style="padding:5px 0;color:${c.ink};">${checksSummary.pass} passed · ${checksSummary.warn} partial · ${checksSummary.fail} failed</td></tr>` : ''}
          </table>
        </td></tr>

        ${payload.keywords ? `<tr><td style="padding:6px 28px 4px;">
          <div style="font:600 10px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${c.muted};margin-bottom:6px;">Phrases they gave us</div>
          <div style="font:400 13px/1.7 'Helvetica Neue',Arial,sans-serif;color:${c.ink};">${esc(payload.keywords).replace(/\n/g, '<br/>')}</div>
        </td></tr>` : ''}

        <tr><td style="padding:14px 28px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bone};border-radius:8px;">
            <tr><td style="padding:13px 16px;font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:${c.ink};">
              Reply to this email to answer <strong>${esc(name || email)}</strong> directly — Reply-To is set.
            </td></tr>
          </table>
        </td></tr>
      </table>

      <div style="font:600 10px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${c.muted};padding-bottom:10px;">The report they received</div>
      ${report.card}

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

  // Search summary: how many searches named them, and who kept coming back.
  const queries = payload.aiVisibility?.queries || [];
  const rivalCount = new Map<string, number>();
  queries.forEach(q => {
    const seen = new Set<string>();
    (q.results || []).forEach(r => {
      if (!r.host || r.isUser || seen.has(r.host)) return;
      seen.add(r.host);
      rivalCount.set(r.host, (rivalCount.get(r.host) || 0) + 1);
    });
  });
  const vis = {
    total: queries.length,
    hits: queries.filter(q => q.appeared).length,
    rivals: [...rivalCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([host, n]) => ({ host, n })),
  };

  // A themed summary of the findings rather than a replay of all thirteen checks.
  const sa2 = payload.siteAudit;
  const byId = (id: string) => checks.find(c => c.id === id);
  const schemaCount = sa2?.schema?.score ?? 0;
  const schemaMax = sa2?.schema?.max ?? 6;
  const missingFiles = [
    sa2?.files?.sitemap === false ? 'sitemap.xml' : null,
    sa2?.files?.llms === false ? 'llms.txt' : null,
  ].filter(Boolean);
  const basics = [
    byId('desc')?.status === 'fail' ? 'no meta description' : null,
    byId('h1')?.status !== 'pass' ? (byId('h1')?.evidence || '').replace(/\.$/, '').toLowerCase() : null,
    byId('title')?.status === 'fail' ? 'no page title' : null,
  ].filter(Boolean);
  const perfScore = sa2?.pagespeed?.performance;
  const issueLines: Array<{ ok: boolean; text: string }> = ([
    {
      ok: schemaCount >= schemaMax - 1,
      text: schemaCount === 0
        ? 'No structured data anywhere on the site. AI engines have to guess what you do, where you are, and what you sell.'
        : `${schemaCount} of ${schemaMax} structured-data types present — the missing ones are what AI engines look for first.`,
    },
    missingFiles.length
      ? { ok: false, text: `Missing ${missingFiles.join(' and ')} — the files that tell crawlers what to read.` }
      : { ok: true, text: 'Crawlers can find their way around: sitemap and llms.txt are both in place.' },
    basics.length
      ? { ok: false, text: `Page basics need work: ${basics.join('; ')}.` }
      : { ok: true, text: 'Page basics are solid — title, description, and one clear heading.' },
    perfScore != null
      ? {
          ok: perfScore >= 80,
          text: perfScore >= 80
            ? `Mobile speed is good (${perfScore}/100).`
            : `Mobile speed is ${perfScore}/100${sa2?.pagespeed?.lcp ? ` — ${sa2.pagespeed.lcp}s before your first real content appears on a phone` : ''}.`,
        }
      : null,
    vis.total ? { ok: vis.hits > 0, text: `Named in ${vis.hits} of ${vis.total} live AI searches using your own phrases.` } : null,
  ].filter(Boolean)) as Array<{ ok: boolean; text: string }>;

  const gradeBg = gradeColor(s.grade);

  const card = `<table role="presentation" width="720" cellpadding="0" cellspacing="0" style="max-width:720px;background:#FFFFFF;border-radius:12px;overflow:hidden;">

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

        ${vis.total ? `
        <tr><td style="padding:16px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:6px;">AI search</div>
          <div style="font:400 14px/1.6 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">
            We ran <strong>${vis.total}</strong> live Perplexity searches using the phrases you gave us. Your site came back in <strong>${vis.hits}</strong> of them.
          </div>
          ${vis.rivals.length ? `
          <div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-top:10px;">Who came back instead, most often:</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:6px;font:400 13px/1.7 'Helvetica Neue',Arial,sans-serif;">
            ${vis.rivals.map(r => `<tr><td style="padding:2px 14px 2px 0;color:#1F2937;">${esc(r.host)}</td><td style="padding:2px 0;color:#9CA3AF;">${r.n} of ${vis.total}</td></tr>`).join('')}
          </table>
          <div style="font:400 12px/1.5 'Helvetica Neue',Arial,sans-serif;color:#9CA3AF;margin-top:8px;">Every search and its full results are listed at the end of this report.</div>` : ''}
        </td></tr>` : ''}

        ${issueLines.length ? `
        <tr><td style="padding:16px 28px 4px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:8px;">What's holding you back</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:400 14px/1.6 'Helvetica Neue',Arial,sans-serif;">
            ${issueLines.map(l => `<tr>
              <td style="padding:5px 10px 5px 0;vertical-align:top;color:${l.ok ? '#3a6f4d' : '#A04324'};font-weight:700;">${l.ok ? '&#10003;' : '&#10007;'}</td>
              <td style="padding:5px 0;color:#1F2937;">${esc(l.text)}</td>
            </tr>`).join('')}
          </table>
        </td></tr>` : ''}

        ${plan.length ? `
        <tr><td style="padding:18px 28px 8px;">
          <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:10px;">Your action plan — in this order</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${plan.map(planCard).join('')}
          </table>
        </td></tr>` : ''}

        <tr><td style="padding:8px 28px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;">
            <tr><td style="padding:18px 20px;">
              <div style="font:600 15px/1.4 'Helvetica Neue',Arial,sans-serif;color:#1F2937;margin-bottom:4px;">Want to DIY?</div>
              <div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-bottom:14px;">Every fix above is something you can do yourself. These two explain the why and the how, in plain English &mdash; no signup, nothing gated.</div>
              <div style="border-left:2px solid #C99356;padding-left:14px;margin-bottom:12px;">
                <a href="https://averde.ai/blog/what-does-ai-ready-website-actually-mean" style="font:600 14px/1.4 'Helvetica Neue',Arial,sans-serif;color:#2A1B11;">What does it actually mean for a website to be &ldquo;AI Ready&rdquo;?</a>
                <div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;">The three things AI engines look for, and why most sites miss all three.</div>
              </div>
              <div style="border-left:2px solid #C99356;padding-left:14px;">
                <a href="https://averde.ai/blog/how-to-make-your-website-ai-ready" style="font:600 14px/1.4 'Helvetica Neue',Arial,sans-serif;color:#2A1B11;">How to make your website AI Ready</a>
                <div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;">The DIY playbook — roughly 30&ndash;45 hours, with AI doing most of the keystrokes.</div>
              </div>
              <div style="border-top:1px solid #E5E7EB;margin-top:16px;padding-top:14px;font:400 13px/1.6 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">
                If you'd rather hand it over, the <strong>AI-Ready Website</strong> rebuild covers every fix on this list &mdash; from $1,500, about 3&ndash;4 weeks.
              </div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:10px 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;border-radius:10px;">
            <tr><td style="padding:18px 20px;">
              <div style="font:600 15px/1.4 'Helvetica Neue',Arial,sans-serif;color:#1F2937;margin-bottom:4px;">Don&rsquo;t want to DIY? I can help.</div>
              <div style="font:400 13px/1.5 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-bottom:14px;">Book a free 30-minute review call — we'll walk through your report and pick the right first move. No pressure either way; everything above is yours to act on.</div>
              <a href="${bookUrl}" style="display:inline-block;background:#2A1B11;color:#F4ECDB;font:600 14px/1 'Helvetica Neue',Arial,sans-serif;padding:12px 22px;border-radius:8px;text-decoration:none;">Book your free review call</a>
            </td></tr>
          </table>
          ${vis.total ? `
          <div style="border-top:1px solid #E5E7EB;margin-top:24px;padding-top:18px;">
            <div style="font:600 11px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:4px;">Appendix: every search we ran</div>
            <div style="font:400 12px/1.5 'Helvetica Neue',Arial,sans-serif;color:#9CA3AF;margin-bottom:12px;">Live Perplexity results at the time of the audit. Your own site is bolded where it appears.</div>
            ${queries.map(q => `
              <div style="margin-bottom:10px;">
                <div style="font:600 12px/1.4 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">
                  <span style="color:${q.appeared ? '#3a6f4d' : '#A04324'};">${q.appeared ? '&#10003;' : '&#10007;'}</span> &ldquo;${esc(q.query)}&rdquo;
                </div>
                ${(q.results || []).length ? `<div style="font:400 11px/1.6 'Helvetica Neue',Arial,sans-serif;color:#9CA3AF;padding-left:14px;">${
                  (q.results || []).slice(0, 4).map(r => `${r.isUser ? '<strong style="color:#3a6f4d;">' : ''}${esc(r.host || r.title || '')}${r.isUser ? '</strong>' : ''}`).join(' · ')
                }</div>` : ''}
              </div>`).join('')}
          </div>` : ''}

          <div style="font:400 12px/1.6 'Helvetica Neue',Arial,sans-serif;color:#6B7280;margin-top:18px;">
            — Mark Bloomfield<br/>Averde AI · Boulder, CO · <a href="https://averde.ai" style="color:#9C6A33;">averde.ai</a>
          </div>
        </td></tr>

      </table>
`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EA;font:400 14px/1.5 'Helvetica Neue',Arial,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:24px 12px;">
    <tr><td align="center">${card}</td></tr>
  </table>
</body></html>`;

  return { html, text: textLines, subject, card };
}
