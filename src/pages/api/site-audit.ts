import type { APIRoute } from 'astro';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Best-effort URL normalization. Accepts "averde.ai", "www.averde.ai", "https://averde.ai/foo".
function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    return u;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AverdeAuditBot/1.0; +https://averde.ai/ai-audit)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Extract schema.org markup types from JSON-LD <script> blocks.
function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const body = m[1].trim();
    try {
      const parsed = JSON.parse(body);
      const walk = (node: unknown) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (typeof node === 'object') {
          const t = (node as Record<string, unknown>)['@type'];
          if (typeof t === 'string') types.add(t);
          if (Array.isArray(t)) t.forEach(v => typeof v === 'string' && types.add(v));
          // walk @graph etc.
          Object.values(node as Record<string, unknown>).forEach(walk);
        }
      };
      walk(parsed);
    } catch {
      /* malformed JSON-LD blocks are common — skip silently */
    }
  }
  return [...types];
}

function pickMeta(html: string, name: string): string | null {
  // Match either name="..." or property="..."
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const alt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
  const m = re.exec(html) || alt.exec(html);
  return m ? m[1].trim() : null;
}

function pickTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].trim() : null;
}

function detectPlatform(html: string, headers: Headers): string | null {
  const generator = pickMeta(html, 'generator');
  if (generator) {
    if (/wordpress/i.test(generator)) return 'WordPress';
    if (/squarespace/i.test(generator)) return 'Squarespace';
    if (/wix/i.test(generator)) return 'Wix';
    if (/webflow/i.test(generator)) return 'Webflow';
    if (/shopify/i.test(generator)) return 'Shopify';
    if (/duda/i.test(generator)) return 'Duda';
    if (/ghost/i.test(generator)) return 'Ghost';
  }
  if (/static\d?\.squarespace\.com/i.test(html)) return 'Squarespace';
  if (/\.wixstatic\.com/i.test(html)) return 'Wix';
  if (/cdn\.shopify\.com/i.test(html)) return 'Shopify';
  if (/wp-content\/|wp-includes\//i.test(html)) return 'WordPress';
  if (/godaddy|website-builder/i.test(html)) return 'GoDaddy';
  const xPowered = headers.get('x-powered-by') || '';
  if (/next\.js/i.test(xPowered)) return 'Next.js (custom)';
  if (/astro/i.test(xPowered)) return 'Astro (custom)';
  return null;
}

// Lighthouse signal from PageSpeed Insights API. Free at low volume, no key required.
async function pageSpeedSignals(target: string): Promise<{
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  lcp: number | null; // largest contentful paint, seconds
  cls: number | null; // cumulative layout shift
} | null> {
  const url =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(target)}&category=performance&category=seo&category=accessibility&strategy=mobile`;
  const controller = new AbortController();
  // Mobile PageSpeed Insights regularly takes 20-40s. Give it room.
  const t = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const cats = data?.lighthouseResult?.categories || {};
    const audits = data?.lighthouseResult?.audits || {};
    const round = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) : null;
    return {
      performance: round(cats?.performance?.score),
      seo: round(cats?.seo?.score),
      accessibility: round(cats?.accessibility?.score),
      lcp: typeof audits?.['largest-contentful-paint']?.numericValue === 'number'
        ? Math.round(audits['largest-contentful-paint'].numericValue / 100) / 10
        : null,
      cls: typeof audits?.['cumulative-layout-shift']?.numericValue === 'number'
        ? Math.round(audits['cumulative-layout-shift'].numericValue * 100) / 100
        : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Cheap follow-ups: does robots.txt + sitemap.xml exist?
async function existsCheck(base: URL): Promise<{ robots: boolean; sitemap: boolean }> {
  const head = async (path: string) => {
    const res = await fetchWithTimeout(new URL(path, base).toString(), 5_000);
    return !!res && res.ok;
  };
  const [robots, sitemap] = await Promise.all([head('/robots.txt'), head('/sitemap.xml')]);
  return { robots, sitemap };
}

export const POST: APIRoute = async ({ request }) => {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }
  const u = normalizeUrl(body.url || '');
  if (!u) return json(400, { ok: false, error: 'invalid_url' });

  const homeRes = await fetchWithTimeout(u.toString(), 10_000);
  if (!homeRes || !homeRes.ok) {
    return json(200, {
      ok: true,
      reachable: false,
      status: homeRes?.status ?? null,
      url: u.toString(),
    });
  }

  const html = await homeRes.text();

  // Schema markup — the key AI-readiness signal
  const schemaTypes = extractSchemaTypes(html);
  const expectedSchemaTypes = ['LocalBusiness', 'Organization', 'FAQPage', 'Service', 'Review', 'Product'];
  const hasSchema = (t: string) =>
    schemaTypes.some(s => s.toLowerCase().includes(t.toLowerCase()));

  const schemaPresent = expectedSchemaTypes.filter(hasSchema);
  const schemaMissing = expectedSchemaTypes.filter(t => !hasSchema(t));

  const findings = {
    ok: true as const,
    reachable: true,
    url: u.toString(),
    finalUrl: homeRes.url,
    title: pickTitle(html),
    description: pickMeta(html, 'description'),
    ogTitle: pickMeta(html, 'og:title'),
    ogDescription: pickMeta(html, 'og:description'),
    ogImage: !!pickMeta(html, 'og:image'),
    twitterCard: !!pickMeta(html, 'twitter:card'),
    platform: detectPlatform(html, homeRes.headers),
    schema: {
      typesFound: schemaTypes,
      present: schemaPresent,
      missing: schemaMissing,
      score: schemaPresent.length, // out of expectedSchemaTypes.length
      max: expectedSchemaTypes.length,
    },
    pagespeed: null as Awaited<ReturnType<typeof pageSpeedSignals>>,
    files: { robots: false, sitemap: false },
  };

  // Fan out the two slow checks in parallel
  const [ps, files] = await Promise.all([
    pageSpeedSignals(u.toString()),
    existsCheck(u),
  ]);
  findings.pagespeed = ps;
  findings.files = files;

  return json(200, findings);
};
