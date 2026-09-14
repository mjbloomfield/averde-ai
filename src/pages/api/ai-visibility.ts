import type { APIRoute } from 'astro';
import { buildQueries, hostsMatch, nameAppears, normalizeHost } from '../../lib/search-queries';

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

  // MAX_QUERIES: picking both scopes doubles the phrases; cap the Perplexity spend.
  const { queries, source } = buildQueries({
    industry, city, keywords: body.keywords, scope: body.scope, max: 12,
  });

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
    source,
    queries: results,
  });
};
