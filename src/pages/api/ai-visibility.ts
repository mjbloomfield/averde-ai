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
  let body: { industry?: string; city?: string; domain?: string; name?: string };
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

  // Two queries — covers both "best/top" framing and a more natural buyer phrasing
  const queries = [
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
    queries: results,
  });
};
