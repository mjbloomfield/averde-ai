import type { APIRoute } from 'astro';
import { promises as dns } from 'node:dns';

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
  if (/assets\.website-files\.com/i.test(html)) return 'Webflow';
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
// /services) — Google's guidelines actually require that. So we can't judge
// schema from the homepage alone: pick up to 4 likely schema-bearing pages
// from the homepage's own links and scan those too.
const SUBPAGE_KEYWORDS = ['faq', 'question', 'how-it-works', 'service', 'rate', 'pricing', 'price', 'treatment', 'about', 'contact'];

function pickSubpages(html: string, base: URL): URL[] {
  const seen = new Set<string>();
  const links: URL[] = [];
  const re = /<a[^>]+href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue;
      if (u.pathname === '/' || /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4)$/i.test(u.pathname)) continue;
      const key = u.pathname.replace(/\/$/, '').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      links.push(u);
    } catch { /* unparseable href */ }
  }
  const picked: URL[] = [];
  for (const kw of SUBPAGE_KEYWORDS) {
    const hit = links.find(l => l.pathname.toLowerCase().includes(kw) && !picked.includes(l));
    if (hit) picked.push(hit);
    if (picked.length >= 4) break;
  }
  return picked;
}

// Cheap follow-ups: do robots.txt / sitemap.xml / llms.txt exist?
async function existsCheck(base: URL): Promise<{ robots: boolean; sitemap: boolean; llms: boolean }> {
  const head = async (path: string) => {
    const res = await fetchWithTimeout(new URL(path, base).toString(), 5_000);
    return !!res && res.ok;
  };
  const [robots, sitemap, llms] = await Promise.all([
    head('/robots.txt'),
    head('/sitemap.xml'),
    head('/llms.txt'),
  ]);
  return { robots, sitemap, llms };
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
  const [homeRes, dnsSig] = await Promise.all([
    fetchWithTimeout(u.toString(), 10_000),
    dnsSignals(u.hostname),
  ]);
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
  const subpages = pickSubpages(html, u);
  const subpageScans = await Promise.all(subpages.map(async sp => {
    const res = await fetchWithTimeout(sp.toString(), 5_000);
    if (!res || !res.ok) return null;
    return { path: sp.pathname, types: extractSchemaTypes(await res.text()) };
  }));
  const pages = [
    { path: '/', types: extractSchemaTypes(html) },
    ...subpageScans.filter((p): p is { path: string; types: string[] } => !!p),
  ];
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
    pagespeed: null as Awaited<ReturnType<typeof pageSpeedSignals>>,
    files: { robots: false, sitemap: false, llms: false },
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
