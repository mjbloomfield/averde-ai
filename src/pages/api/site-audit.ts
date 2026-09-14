import type { APIRoute } from 'astro';
import { promises as dns } from 'node:dns';
import { dfsAuth, dfsPost, firstResult } from '../../lib/dataforseo';

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

// Readable text from the homepage, for the one-paragraph description of the
// business in the internal lead email. The website audit never asks what the
// business does, so this is the only place that answer can come from.
function visibleText(html: string, max = 1800): string {
  return html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Per-page signals. The crawl below already fetches these pages for schema, so
// everything here is free — no extra requests. Site-wide checks (duplicate
// titles, missing descriptions, alt text) can only be judged across pages;
// the homepage on its own says nothing about them.
type PageSignals = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  imgTotal: number;
  imgWithAlt: number;
  textLen: number;
};

function pickCanonical(html: string): string | null {
  const m = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)
    || /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i.exec(html);
  return m ? m[1].trim() : null;
}

function pageSignals(html: string): PageSignals {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  // alt="" is the correct markup for a decorative image, so it counts as done.
  const imgWithAlt = imgs.filter(tag => /\salt\s*=\s*["']/i.test(tag)).length;
  return {
    title: pickTitle(html),
    description: pickMeta(html, 'description'),
    canonical: pickCanonical(html),
    imgTotal: imgs.length,
    imgWithAlt,
    textLen: visibleText(html, 4000).length,
  };
}

// DNS signals — A records, CNAME chain, and nameservers all fingerprint
// site builders and hosts that hide from HTML sniffing. Best-effort with a
// short timeout; any lookup that fails just returns empty.
type DnsSignals = { a: string[]; cname: string[]; ns: string[] };

async function dnsSignals(host: string): Promise<DnsSignals> {
  const withTimeout = async <T>(p: Promise<T>): Promise<T | null> => {
    let t: ReturnType<typeof setTimeout>;
    const timeout = new Promise<null>(resolve => { t = setTimeout(() => resolve(null), 3_000); });
    const result = await Promise.race([p.catch(() => null), timeout]);
    clearTimeout(t!);
    return result;
  };
  // Naive apex extraction (handles the common two-part-TLD cases).
  const parts = host.replace(/^www\./, '').split('.');
  const twoPartTld = /\.(co|com|org|net|gov|ac)\.[a-z]{2}$/i.test(host);
  const apex = parts.slice(twoPartTld ? -3 : -2).join('.');

  const [a, cname, ns] = await Promise.all([
    withTimeout(dns.resolve4(host)),
    withTimeout(dns.resolveCname(host)),
    withTimeout(dns.resolveNs(apex)),
  ]);
  return { a: a ?? [], cname: (cname ?? []).map(c => c.toLowerCase()), ns: (ns ?? []).map(n => n.toLowerCase()) };
}

function detectPlatform(html: string, headers: Headers, dnsSig: DnsSignals): string | null {
  const generator = pickMeta(html, 'generator');
  if (generator) {
    if (/wordpress/i.test(generator)) return 'WordPress';
    if (/squarespace/i.test(generator)) return 'Squarespace';
    if (/wix/i.test(generator)) return 'Wix';
    if (/webflow/i.test(generator)) return 'Webflow';
    if (/shopify/i.test(generator)) return 'Shopify';
    if (/duda/i.test(generator)) return 'Duda';
    if (/ghost/i.test(generator)) return 'Ghost';
    if (/hubspot/i.test(generator)) return 'HubSpot';
    if (/framer/i.test(generator)) return 'Framer';
  }
  // HTML fingerprints
  if (/static\d?\.squarespace\.com/i.test(html)) return 'Squarespace';
  if (/\.wixstatic\.com|wix-code|parastorage\.com/i.test(html)) return 'Wix';
  if (/cdn\.shopify\.com/i.test(html)) return 'Shopify';
  if (/wp-content\/|wp-includes\//i.test(html)) return 'WordPress';
  if (/framerusercontent\.com/i.test(html)) return 'Framer';
  if (/js\.hs-scripts\.com|hubspotusercontent/i.test(html)) return 'HubSpot';
  if (/website-files\.com/i.test(html)) return 'Webflow';   // assets. (old) and cdn.prod. (current)
  if (/godaddy|website-builder/i.test(html)) return 'GoDaddy';
  // Response headers
  if (/squarespace/i.test(headers.get('server') || '')) return 'Squarespace';
  if (headers.get('x-wix-request-id')) return 'Wix';
  if (headers.get('x-shopify-stage') || headers.get('x-shopid')) return 'Shopify';
  const xPowered = headers.get('x-powered-by') || '';
  if (/next\.js/i.test(xPowered)) return 'Next.js (custom)';
  if (/astro/i.test(xPowered)) return 'Astro (custom)';
  // DNS fingerprints — catch sites whose HTML gives nothing away
  const SQUARESPACE_IPS = ['198.185.159.144', '198.185.159.145', '198.49.23.144', '198.49.23.145'];
  const SHOPIFY_IPS = ['23.227.38.65', '23.227.38.74'];
  if (dnsSig.a.some(ip => SQUARESPACE_IPS.includes(ip))) return 'Squarespace';
  if (dnsSig.a.some(ip => SHOPIFY_IPS.includes(ip)) || dnsSig.cname.some(c => c.endsWith('myshopify.com'))) return 'Shopify';
  if (dnsSig.cname.some(c => c.includes('webflow'))) return 'Webflow';
  if (dnsSig.ns.some(n => n.endsWith('wixdns.net'))) return 'Wix';
  return null;
}

// Infrastructure host — distinct from the builder/CMS. Tells us who serves
// the site (and therefore whether "custom-built" is a fair description).
// Order matters: origin-specific headers first; Cloudflare last because its
// proxy masks whatever sits behind it.
function detectHosting(headers: Headers, dnsSig: DnsSignals): string | null {
  const server = headers.get('server') || '';
  if (headers.get('x-vercel-id') || /vercel/i.test(server)) return 'Vercel';
  if (headers.get('x-nf-request-id') || /netlify/i.test(server)) return 'Netlify';
  if (headers.get('x-github-request-id') || /github\.com/i.test(server)) return 'GitHub Pages';
  if (headers.get('x-kinsta-cache')) return 'Kinsta';
  if (headers.get('x-pantheon-styx-hostname')) return 'Pantheon';
  if (/wpengine/i.test(headers.get('x-powered-by') || '')) return 'WP Engine';
  if (/flywheel/i.test(server)) return 'Flywheel';
  if (headers.get('x-amz-cf-id')) return 'AWS CloudFront';
  if (headers.get('x-served-by') && /varnish/i.test(headers.get('via') || '')) return 'Fastly';
  if (dnsSig.a.includes('76.76.21.21') || dnsSig.cname.some(c => c.includes('vercel-dns'))) return 'Vercel';
  if (dnsSig.a.includes('75.2.60.5') || dnsSig.cname.some(c => c.endsWith('netlify.app'))) return 'Netlify';
  if (dnsSig.cname.some(c => c.endsWith('github.io'))) return 'GitHub Pages';
  if (headers.get('cf-ray')) return 'Cloudflare';
  if (/litespeed/i.test(server)) return 'shared hosting (LiteSpeed)';
  return null;
}

// Lighthouse signal from PageSpeed Insights API. Without an API key we share
// the public unauthenticated quota with the whole internet and get 429'd
// constantly. With a key (free, 25k queries/day per project), it's reliable.
async function pageSpeedSignals(target: string): Promise<{
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  lcp: number | null; // largest contentful paint, seconds
  cls: number | null; // cumulative layout shift
} | null> {
  const apiKey = import.meta.env.PAGESPEED_API_KEY;
  const url =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(target)}&category=performance&category=seo&category=accessibility&strategy=mobile` +
    (apiKey ? `&key=${encodeURIComponent(apiKey)}` : '');
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

// Schema often lives on the page it describes (FAQPage on /faq, Service on
// /services) — Google's guidelines actually require that — so judging schema
// from the homepage alone misses most of it. The sitemap is the fast path: one
// request for the whole map. Without one we crawl, because the sites most
// likely to fail this audit are also the least likely to publish a sitemap.
const MAX_PAGES = 40;         // pages scanned in addition to the homepage
const CRAWL_DEPTH = 3;        // homepage links, then two hops further
const DISCOVERY_MS = 38_000;  // hard ceiling; we report what we have when it's hit
const BATCH = 4;              // concurrent page fetches
// We are crawling someone else's site, often on shared hosting. Four at a time
// with a pause between batches is roughly three requests a second — well under
// what one browser does loading a single page, and slow enough not to look
// like an attack to a WAF.
const BATCH_PAUSE_MS = 350;

const SKIP_PATH =
  /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|css|js|xml|json|ico|woff2?|ttf)$|^\/(wp-admin|wp-json|wp-content|cdn-cgi|keystatic|admin)\b|\/(tag|tags|category|categories|author|page)\//i;

const norm = (u: URL) => (u.pathname.replace(/\/+$/, '') || '/').toLowerCase();
const bareHost = (h: string) => h.replace(/^www\./, '');

// Rank candidates so a 12-page budget goes to pages that carry schema and
// answer buyer questions, not to the fifth page of a blog archive.
function rankPath(path: string): number {
  const p = path.toLowerCase();
  let score = 0;
  if (/(faq|question)/.test(p)) score += 40;
  if (/(service|treatment|solution|what-we-do|capabilit)/.test(p)) score += 35;
  if (/(pricing|price|rate|cost|plan)/.test(p)) score += 30;
  if (/(about|team|who-we-are|story)/.test(p)) score += 20;
  if (/(contact|book|schedule|appointment|quote|estimate)/.test(p)) score += 20;
  if (/(condition|industr|location|area|case-stud|portfolio|work|project)/.test(p)) score += 15;
  if (/(blog|news|article|post|insight)/.test(p)) score -= 10;
  if (/(privacy|terms|legal|cookie|sitemap|login|cart|checkout|account)/.test(p)) score -= 40;
  score -= (p.split('/').filter(Boolean).length - 1) * 8; // prefer shallow
  return score;
}

function linksFrom(html: string, base: URL): URL[] {
  const out: URL[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href=["']([^"'#\s]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], base);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      if (bareHost(u.hostname) !== bareHost(base.hostname)) continue;
      if (SKIP_PATH.test(u.pathname)) continue;
      const key = norm(u);
      if (key === '/' || seen.has(key)) continue;
      seen.add(key);
      u.hash = '';
      u.search = '';
      out.push(u);
    } catch { /* unparseable href */ }
  }
  return out;
}

// Returns the sitemap's URLs, or null when there's no usable sitemap. Follows
// one level of <sitemapindex> nesting, which is how most CMSs split large maps.
async function sitemapUrls(base: URL): Promise<URL[] | null> {
  const load = async (target: string): Promise<string | null> => {
    const res = await fetchWithTimeout(target, 6_000);
    if (!res || !res.ok) return null;
    const body = await res.text();
    return /<(urlset|sitemapindex)/i.test(body) ? body : null;
  };
  const root = await load(new URL('/sitemap.xml', base).toString());
  if (!root) return null;

  const locs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1]);
  let raw = locs(root);
  if (/<sitemapindex/i.test(root)) {
    const children = await Promise.all(raw.slice(0, 3).map(load));
    raw = children.filter(Boolean).flatMap(x => locs(x as string));
  }

  const seen = new Set<string>();
  const out: URL[] = [];
  for (const href of raw) {
    try {
      const u = new URL(href);
      if (bareHost(u.hostname) !== bareHost(base.hostname)) continue;
      if (SKIP_PATH.test(u.pathname)) continue;
      const key = norm(u);
      if (key === '/' || seen.has(key)) continue;
      seen.add(key);
      out.push(u);
    } catch { /* malformed <loc> */ }
  }
  return out;
}

// Walks the site and extracts schema types per page. Sitemap when available,
// breadth-first crawl otherwise; capped by page count, depth, and wall clock.
async function scanPages(base: URL, homeHtml: string): Promise<{
  pages: ({ path: string; types: string[] } & PageSignals)[];
  sitemap: boolean;
  method: 'sitemap' | 'crawl';
}> {
  const started = Date.now();
  const pages = [{ path: '/', types: extractSchemaTypes(homeHtml), ...pageSignals(homeHtml) }];
  const seen = new Set<string>(['/']);

  const fromMap = await sitemapUrls(base);
  const crawling = !fromMap;
  let queue = (fromMap ?? linksFrom(homeHtml, base)).map(url => ({ url, depth: 1 }));

  while (queue.length && pages.length <= MAX_PAGES && Date.now() - started < DISCOVERY_MS) {
    queue.sort((a, b) => rankPath(b.url.pathname) - rankPath(a.url.pathname));
    const batch = queue.splice(0, Math.min(BATCH, MAX_PAGES + 1 - pages.length));
    const results = await Promise.all(batch.map(async ({ url, depth }) => {
      const key = norm(url);
      if (seen.has(key)) return null;
      seen.add(key);
      const res = await fetchWithTimeout(url.toString(), 5_000);
      if (!res || !res.ok) return null;
      if (!/text\/html/i.test(res.headers.get('content-type') || 'text/html')) return null;
      const html = await res.text();
      return { path: url.pathname, types: extractSchemaTypes(html), signals: pageSignals(html), html, depth };
    }));

    if (queue.length) await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));

    for (const r of results) {
      if (!r) continue;
      pages.push({ path: r.path, types: r.types, ...r.signals });
      if (crawling && r.depth < CRAWL_DEPTH) {
        for (const link of linksFrom(r.html, base)) {
          if (!seen.has(norm(link))) queue.push({ url: link, depth: r.depth + 1 });
        }
      }
    }
  }

  return { pages, sitemap: !!fromMap, method: crawling ? 'crawl' : 'sitemap' };
}

// Cheap follow-ups: do robots.txt / llms.txt exist? (sitemap comes from scanPages)
async function existsCheck(base: URL): Promise<{ robots: boolean; llms: boolean }> {
  const head = async (path: string) => {
    const res = await fetchWithTimeout(new URL(path, base).toString(), 5_000);
    return !!res && res.ok;
  };
  const [robots, llms] = await Promise.all([head('/robots.txt'), head('/llms.txt')]);
  return { robots, llms };
}

// Pages our own fetcher saw as empty get one more look, through a renderer.
// We read raw HTML, so a site that builds its content in the browser hands us a
// shell — and every check downstream then reports missing titles and missing
// schema that are actually there. Capped at three pages: this is to find out
// whether the site is readable at all, not to re-audit it.
const RENDER_MAX_PAGES = 3;

type RenderedPage = { path: string; title: string | null; description: string | null; textLen: number };

async function renderEmptyPages(base: URL, paths: string[]): Promise<RenderedPage[] | null> {
  const auth = dfsAuth();
  if (!auth || !paths.length) return null;

  const targets = paths.slice(0, RENDER_MAX_PAGES);
  const data = await dfsPost(
    'on_page/instant_pages',
    targets.map(path => ({
      url: new URL(path, base).toString(),
      enable_javascript: true,
      load_resources: true,
    })),
    40_000,
    auth,
  );
  if (!data) return null;

  // One task per URL, each with a single page in its items array.
  const tasks = (data.tasks as Array<Record<string, unknown>>) || [];
  const out: RenderedPage[] = [];
  for (const task of tasks) {
    const result = ((task.result as Array<Record<string, unknown>>) || [])[0];
    const item = ((result?.items as Array<Record<string, unknown>>) || [])[0];
    if (!item) continue;
    const meta = (item.meta as Record<string, unknown>) || {};
    const content = (meta.content as Record<string, unknown>) || {};
    let path = '/';
    try { path = new URL(String(item.url || '')).pathname; } catch { /* keep / */ }
    out.push({
      path,
      title: (meta.title as string) || null,
      description: (meta.description as string) || null,
      textLen: Number(content.plain_text_size ?? 0),
    });
  }
  return out.length ? out : null;
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

  // DNS runs in parallel with the page fetch — both only need the hostname.
  // Look up DNS for both the apex and www: platform CNAMEs usually hang off
  // whichever one the site actually redirects to, and we can't know which
  // until the fetch resolves.
  const altHost = u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`;
  const [homeRes, dnsPrimary, dnsAlt] = await Promise.all([
    fetchWithTimeout(u.toString(), 10_000),
    dnsSignals(u.hostname),
    dnsSignals(altHost),
  ]);
  const dnsSig = {
    a: [...dnsPrimary.a, ...dnsAlt.a],
    cname: [...dnsPrimary.cname, ...dnsAlt.cname],
    ns: [...dnsPrimary.ns, ...dnsAlt.ns],
  };
  if (!homeRes || !homeRes.ok) {
    return json(200, {
      ok: true,
      reachable: false,
      status: homeRes?.status ?? null,
      url: u.toString(),
    });
  }

  const html = await homeRes.text();

  // Schema markup — the key AI-readiness signal.
  // schema.org has a deep inheritance tree (Dentist IS-A LocalBusiness IS-A
  // Organization). We map the user's actual found types to the umbrella
  // categories AI engines care about.
  // PageSpeed regularly takes 20-40s and doesn't depend on the crawl, so start
  // it here rather than after. The audit's wall clock is now whichever of the
  // two is slower, not the sum, which is what pays for the larger page budget.
  const slowChecks = Promise.all([pageSpeedSignals(u.toString()), existsCheck(u)]);

  const scan = await scanPages(u, html);
  const pages = scan.pages;
  const schemaTypes = [...new Set(pages.flatMap(p => p.types))];
  const SCHEMA_INHERITANCE: Record<string, string[]> = {
    LocalBusiness: [
      'LocalBusiness', 'Dentist', 'MedicalBusiness', 'MedicalClinic', 'Optician', 'Pharmacy',
      'HomeAndConstructionBusiness', 'HVACBusiness', 'Plumber', 'Electrician', 'Locksmith', 'RoofingContractor',
      'AutoRepair', 'AutoBodyShop', 'AutoDealer', 'AutoPartsStore', 'GasStation',
      'Restaurant', 'Bar', 'CafeOrCoffeeShop', 'FastFoodRestaurant', 'Bakery', 'FoodEstablishment',
      'ProfessionalService', 'FinancialService', 'AccountingService', 'InsuranceAgency',
      'LegalService', 'Attorney', 'Notary',
      'RealEstateAgent', 'RealEstateListing',
      'HealthAndBeautyBusiness', 'BeautySalon', 'DaySpa', 'HairSalon', 'NailSalon',
      'VeterinaryCare', 'ChildCare', 'PreSchool', 'EducationalOrganization',
      'Store', 'Florist', 'GroceryStore', 'ClothingStore', 'JewelryStore', 'FurnitureStore',
      'SportsActivityLocation', 'ExerciseGym', 'GolfCourse',
      'LodgingBusiness', 'Hotel', 'Resort', 'BedAndBreakfast',
      'Animal', 'PetStore',
    ],
    Organization: ['Organization', 'Corporation', 'NGO', 'EducationalOrganization', 'GovernmentOrganization'],
    FAQPage: ['FAQPage'],
    Service: ['Service', 'FinancialProduct', 'MedicalProcedure'],
    Review: ['Review', 'AggregateRating'],
    Product: ['Product', 'IndividualProduct', 'ProductModel'],
  };
  const expectedSchemaTypes = Object.keys(SCHEMA_INHERITANCE);
  const lowerFound = schemaTypes.map(t => t.toLowerCase());
  const hasSchema = (umbrella: string) => {
    const variants = (SCHEMA_INHERITANCE[umbrella] || [umbrella]).map(v => v.toLowerCase());
    return variants.some(v => lowerFound.includes(v));
  };
  const schemaPresent = expectedSchemaTypes.filter(hasSchema);
  const schemaMissing = expectedSchemaTypes.filter(t => !hasSchema(t));
  // Which scanned page each umbrella type was first seen on (for evidence lines).
  const schemaFoundOn: Record<string, string> = {};
  for (const umbrella of schemaPresent) {
    const variants = (SCHEMA_INHERITANCE[umbrella] || [umbrella]).map(v => v.toLowerCase());
    const page = pages.find(p => p.types.some(t => variants.includes(t.toLowerCase())));
    if (page) schemaFoundOn[umbrella] = page.path;
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;

  // Site-wide signals across every page the crawl reached. Duplicate titles are
  // the common failure: site builders default every page to the business name,
  // so an engine can't tell the services page from the contact page.
  // One page served at several URLs (Squarespace's / and /home, trailing-slash
  // variants, tracking parameters) is not a duplicate-title problem. Where a
  // canonical tag says two URLs are the same page, judge them once.
  const seenCanonical = new Set<string>();
  const distinct = pages.filter(p => {
    const c = (p.canonical || '').replace(/\/+$/, '').toLowerCase();
    if (!c) return true;
    if (seenCanonical.has(c)) return false;
    seenCanonical.add(c);
    return true;
  });

  const titleGroups = new Map<string, string[]>();
  for (const p of distinct) {
    const key = (p.title || '').trim().toLowerCase();
    if (!key) continue;
    if (!titleGroups.has(key)) titleGroups.set(key, []);
    titleGroups.get(key)!.push(p.path);
  }
  const duplicateTitles = [...titleGroups.values()].filter(paths => paths.length > 1);
  const siteWide = {
    pages: distinct.length,
    crawled: pages.length,
    missingTitle: distinct.filter(p => !p.title).map(p => p.path),
    duplicateTitles,
    missingDescription: distinct.filter(p => !p.description).map(p => p.path),
    imgTotal: distinct.reduce((n, p) => n + p.imgTotal, 0),
    imgWithAlt: distinct.reduce((n, p) => n + p.imgWithAlt, 0),
    // Pages that returned almost no readable text. Usually a site that builds
    // its content in the browser: we fetch raw HTML, so we get the empty shell
    // an AI crawler without a renderer would also get. Worth saying out loud
    // rather than letting every other check fail on a page nobody can read.
    emptyPages: distinct.filter(p => p.textLen < 250).map(p => p.path),
  };

  const findings = {
    ok: true as const,
    reachable: true,
    url: u.toString(),
    finalUrl: homeRes.url,
    https: homeRes.url.startsWith('https://'),
    h1Count,
    title: pickTitle(html),
    description: pickMeta(html, 'description'),
    ogTitle: pickMeta(html, 'og:title'),
    ogDescription: pickMeta(html, 'og:description'),
    ogImage: !!pickMeta(html, 'og:image'),
    twitterCard: !!pickMeta(html, 'twitter:card'),
    platform: detectPlatform(html, homeRes.headers, dnsSig),
    hosting: detectHosting(homeRes.headers, dnsSig),
    schema: {
      typesFound: schemaTypes,
      present: schemaPresent,
      missing: schemaMissing,
      foundOn: schemaFoundOn,
      pagesScanned: pages.map(p => p.path),
      score: schemaPresent.length, // out of expectedSchemaTypes.length
      max: expectedSchemaTypes.length,
    },
    siteWide,
    rendered: null as RenderedPage[] | null,
    renderFixes: [] as string[],
    excerpt: visibleText(html),
    pagespeed: null as Awaited<ReturnType<typeof pageSpeedSignals>>,
    files: { robots: false, sitemap: false, llms: false },
    discovery: { method: scan.method, pagesScanned: pages.length },
  };

  // Only spends a DataForSEO call when our own fetch came back empty.
  if (siteWide.emptyPages.length) {
    const rendered = await renderEmptyPages(u, siteWide.emptyPages);
    if (rendered) {
      findings.rendered = rendered;
      // A page that has real content once rendered is a JavaScript problem,
      // not an empty page. Say which, because the fix is different.
      findings.renderFixes = rendered.filter(r => r.textLen >= 250).map(r => r.path);
    }
  }

  const [ps, files] = await slowChecks;
  findings.pagespeed = ps;
  findings.files = { ...files, sitemap: scan.sitemap };

  return json(200, findings);
};
