import type { APIRoute } from 'astro';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  host: string;
  isUser: boolean;
};

type QueryResult = {
  query: string;
  appeared: boolean;
  results: SearchHit[];
};

function normalizeHost(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function hostsMatch(a: string, b: string): boolean {
  const A = a.replace(/^www\./, '');
  const B = b.replace(/^www\./, '');
  return A === B || A.endsWith('.' + B) || B.endsWith('.' + A);
}

function nameAppears(name: string, text: string): boolean {
  const n = name.trim();
  if (!n || n.length < 4) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

async function perplexitySearch(
  apiKey: string,
  query: string,
  maxResults: number,
  timeoutMs: number,
): Promise<Array<{ title: string; url: string; snippet: string }> | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        max_tokens_per_page: 256,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((r: Record<string, unknown>) => ({
      title: String(r.title || ''),
      url: String(r.url || ''),
      snippet: String(r.snippet || ''),
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export const POST: APIRoute = async ({ request }) => {
  let body: { industry?: string; city?: string; domain?: string; name?: string; keywords?: string[]; scope?: string[] };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const industry = (body.industry || '').trim();
  const city = (body.city || '').trim();
  const businessName = (body.name || '').trim();
  const userHost = normalizeHost(body.domain || '');

  if (!industry || !city) {
    return json(400, { ok: false, error: 'missing_industry_or_city' });
  }

  const apiKey = import.meta.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return json(200, { ok: true, configured: false, queries: [] });
  }

  // Prefer the user's own customer search phrases (step 2 of the form) —
  // they know what buyers actually type far better than an industry label.
  // Fall back to generic industry queries only if no phrases were given.
  const rawKeywords = Array.isArray(body.keywords) ? body.keywords : [];
  const keywords = [...new Set(rawKeywords.map(k => String(k).trim()).filter(k => k.length > 2))].slice(0, 10);
  const MAX_QUERIES = 12; // picking both scopes doubles the phrases; cap the Perplexity spend
  const cityToken = (city.split(/[\s,]+/)[0] || '').toLowerCase();

  // Only bolt the audit's city onto a phrase that names no place at all.
  // Testing for our own city isn't enough: someone serving two markets writes
  // "firmware engineering in san francisco", and appending their home city
  // produced "…in san francisco Boulder, CO" — a query no buyer would type.
  const STATES = /\b(a[klrz]|c[aot]|d[ce]|fl|ga|hi|i[adln]|k[sy]|la|m[adeinost]|n[cdehjmvy]|o[hkr]|pa|ri|s[cd]|t[nx]|ut|v[at]|w[aivy])\b/i;
  const namesAPlace = (k: string) =>
    /\b(in|near|around|serving|based)\s+\S/i.test(k) || /near me/i.test(k) || STATES.test(k);

  // Scope comes from the form: near-me, nationwide, or both. A phrase that
  // already names a place is never rewritten under any scope — the buyer told
  // us where they meant.
  const scope = Array.isArray(body.scope) && body.scope.length ? body.scope : ['local'];
  const wantsLocal = scope.includes('local');
  const wantsNational = scope.includes('national');

  const variants = (k: string): string[] => {
    if (!cityToken || namesAPlace(k) || k.toLowerCase().includes(cityToken)) return [k];
    const out: string[] = [];
    if (wantsLocal) out.push(`${k} ${city}`);
    if (wantsNational) out.push(k);
    return out.length ? out : [k];
  };

  // Round-robin by variant so the cap trims second variants rather than
  // dropping a phrase the owner typed.
  const perPhrase = keywords.map(variants);
  const widest = Math.max(0, ...perPhrase.map(v => v.length));
  const queries = keywords.length
    ? Array.from({ length: widest })
        .flatMap((_, i) => perPhrase.map(v => v[i]).filter(Boolean))
        .slice(0, MAX_QUERIES)
    : [
        `best ${industry.toLowerCase()} in ${city}`,
        `${industry.toLowerCase()} ${city} recommendations`,
      ];

  const results: QueryResult[] = await Promise.all(
    queries.map(async query => {
      const raw = await perplexitySearch(apiKey, query, 6, 15_000);
      if (!raw) return { query, appeared: false, results: [] };
      const enriched: SearchHit[] = raw.map(r => {
        const host = normalizeHost(r.url) || '';
        const isUser =
          (!!userHost && hostsMatch(host, userHost)) ||
          nameAppears(businessName, r.title) ||
          nameAppears(businessName, r.snippet);
        return { ...r, host, isUser };
      });
      return {
        query,
        appeared: enriched.some(r => r.isUser),
        results: enriched,
      };
    }),
  );

  const anyAppearance = results.some(r => r.appeared);

  return json(200, {
    ok: true,
    configured: true,
    industry,
    city,
    businessName: businessName || null,
    userHost,
    appeared: anyAppearance,
    appearedCount: results.filter(r => r.appeared).length,
    source: keywords.length ? 'keywords' : 'industry',
    queries: results,
  });
};
