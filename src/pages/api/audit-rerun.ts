import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One re-run an hour per report. The site audit spends a Google PageSpeed
// call, and the report URL is shareable, so an unthrottled button is a way to
// burn the quota.
const COOLDOWN_MS = 60 * 60 * 1000;

type Signals = {
  https?: boolean;
  title?: string | null;
  description?: string | null;
  h1Count?: number;
  schema?: { present?: string[] };
  files?: { sitemap?: boolean; robots?: boolean; llms?: boolean };
  pagespeed?: { performance?: number | null; seo?: number | null } | null;
  siteWide?: {
    pages?: number;
    duplicateTitles?: string[][];
    missingDescription?: string[];
    imgTotal?: number;
    imgWithAlt?: number;
  };
};

const SCHEMA_LABEL: Record<string, string> = {
  LocalBusiness: 'LocalBusiness schema',
  FAQPage: 'FAQ schema',
  Service: 'Service schema',
  Organization: 'Organization schema',
  Review: 'Review schema',
  Product: 'Product schema',
};

// Plain sentences a business owner can act on — never a field name.
function diffSignals(then: Signals, now: Signals): string[] {
  const out: string[] = [];

  const gained = (before?: boolean, after?: boolean) => before === false && after === true;
  const lost = (before?: boolean, after?: boolean) => before === true && after === false;

  if (gained(then.https, now.https)) out.push('Your site now loads over a secure connection (HTTPS).');
  if (lost(then.https, now.https)) out.push('Your site is no longer loading over HTTPS — worth checking with your host today.');

  const wasSchema = new Set(then.schema?.present ?? []);
  const nowSchema = new Set(now.schema?.present ?? []);
  for (const t of nowSchema) if (!wasSchema.has(t)) out.push(`Added ${SCHEMA_LABEL[t] ?? t + ' schema'}.`);
  for (const t of wasSchema) if (!nowSchema.has(t)) out.push(`${SCHEMA_LABEL[t] ?? t + ' schema'} is no longer on the pages we checked.`);

  const files: [keyof NonNullable<Signals['files']>, string][] = [
    ['sitemap', 'A sitemap.xml'],
    ['robots', 'A robots.txt'],
    ['llms', 'An llms.txt'],
  ];
  for (const [key, label] of files) {
    if (gained(then.files?.[key], now.files?.[key])) out.push(`${label} is now published.`);
    if (lost(then.files?.[key], now.files?.[key])) out.push(`${label} has gone missing.`);
  }

  const speed = (key: 'performance' | 'seo', label: string) => {
    const a = then.pagespeed?.[key];
    const b = now.pagespeed?.[key];
    if (typeof a !== 'number' || typeof b !== 'number') return;
    if (Math.abs(b - a) < 5) return;   // Lighthouse wobbles a few points run to run
    out.push(`${label} went from ${a} to ${b} out of 100.`);
  };
  speed('performance', 'Your mobile speed score');
  speed('seo', 'Your technical SEO score');

  if (!then.title && now.title) out.push('Your homepage has a title now.');
  if (!then.description && now.description) out.push('Your homepage has a meta description now.');
  if (then.h1Count !== 1 && now.h1Count === 1) out.push('Your homepage now has exactly one main heading.');

  // Site-wide signals only exist on runs from Sep 2026 onward.
  if (then.siteWide && now.siteWide) {
    const dupThen = then.siteWide.duplicateTitles?.length ?? 0;
    const dupNow = now.siteWide.duplicateTitles?.length ?? 0;
    if (dupNow < dupThen) out.push(`Duplicate page titles: ${dupThen} down to ${dupNow}.`);
    if (dupNow > dupThen) out.push(`Duplicate page titles: ${dupThen} up to ${dupNow}.`);

    const missThen = then.siteWide.missingDescription?.length ?? 0;
    const missNow = now.siteWide.missingDescription?.length ?? 0;
    if (missNow !== missThen) out.push(`Pages with no description: ${missThen} to ${missNow}.`);

    const pct = (s?: Signals['siteWide']) =>
      s && s.imgTotal ? Math.round(((s.imgWithAlt ?? 0) / s.imgTotal) * 100) : null;
    const altThen = pct(then.siteWide);
    const altNow = pct(now.siteWide);
    if (altThen != null && altNow != null && Math.abs(altNow - altThen) >= 5) {
      out.push(`Images with alt text: ${altThen}% to ${altNow}%.`);
    }
  }

  return out;
}

export const POST: APIRoute = async ({ request, url }) => {
  let body: { reportId?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, message: 'Bad request.' });
  }
  const id = (body.reportId || '').trim();
  if (!UUID.test(id)) return json(400, { ok: false, message: 'Bad request.' });

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return json(200, { ok: false, message: 'Re-runs aren’t available right now.' });

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('audit_reports')
    .select('website, site_audit, created_at, last_rerun_at, rerun_count')
    .eq('id', id)
    .single();

  if (error || !data) return json(404, { ok: false, message: 'Report not found.' });
  if (!data.website || !data.site_audit) {
    return json(200, {
      ok: false,
      message: 'This report was created before we started saving the checks, so there’s nothing to compare against. Run a fresh audit at averde.ai/website-audit.',
    });
  }
  if (data.last_rerun_at && Date.now() - new Date(data.last_rerun_at).getTime() < COOLDOWN_MS) {
    return json(200, { ok: false, message: 'You already re-checked this in the last hour. Sites take a while to change — try again later today.' });
  }

  const res = await fetch(new URL('/api/site-audit', url.origin).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: data.website }),
  });
  if (!res.ok) return json(200, { ok: false, message: 'We couldn’t reach your site just now. Try again in a minute.' });
  const fresh = (await res.json()) as Signals & { reachable?: boolean };
  if (!fresh.reachable) {
    return json(200, { ok: false, message: 'We couldn’t load your site just now — it may be down, or blocking automated checks.' });
  }

  const since = new Date(data.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Denver',
  });

  await supabase
    .from('audit_reports')
    .update({ last_rerun_at: new Date().toISOString(), rerun_count: (data.rerun_count ?? 0) + 1 })
    .eq('id', id);

  return json(200, { ok: true, since, changes: diffSignals(data.site_audit as Signals, fresh) });
};
