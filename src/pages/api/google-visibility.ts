import type { APIRoute } from 'astro';
import { buildQueries, hostsMatch, nameAppears, normalizeHost } from '../../lib/search-queries';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Hit = { rank: number; title: string; url: string; host: string; isUser: boolean };

type QueryResult = {
  query: string;
  ran: boolean;
  organic: Hit[];
  paid: Hit[];
  userRank: number | null;       // best organic position, null = not on page one
  userPaidRank: number | null;
  aiOverview: null | {           // null = Google showed no AI Overview for this search
    cited: boolean;              // is the business among the sources it cites
    sources: Array<{ host: string; title: string; isUser: boolean }>;
  };
};

// Live SERP costs $0.002 a query. Six is enough to tell someone where they
// stand without turning a free audit into a real bill.
const MAX_QUERIES = 6;
const DEPTH = 10;          // page one
const TIMEOUT_MS = 45_000; // these usually land in 10-15s

async function serp(auth: string, keyword: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      // AI Overviews load after the page does, so Google doesn't send one with
      // the initial HTML unless we ask for it to be waited for.
      body: JSON.stringify([{
        keyword,
        location_name: 'United States',
        language_code: 'en',
        depth: DEPTH,
        load_async_ai_overview: true,
      }]),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status_code !== 20000) return null;
    const task = (data.tasks || [])[0];
    if (task?.status_code !== 20000) return null;
    return (task.result || [])[0] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export const POST: APIRoute = async ({ request }) => {
  let body: { industry?: string; city?: string; domain?: string; name?: string; keywords?: unknown; scope?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const industry = (body.industry || '').trim();
  const city = (body.city || '').trim();
  const businessName = (body.name || '').trim();
  const userHost = normalizeHost(body.domain || '');

  if (!industry || !city) return json(400, { ok: false, error: 'missing_industry_or_city' });

  const login = import.meta.env.DATAFORSEO_LOGIN;
  const password = import.meta.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return json(200, { ok: true, configured: false, queries: [] });
  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  const { queries, source } = buildQueries({ industry, city, keywords: body.keywords, scope: body.scope, max: MAX_QUERIES });

  const mine = (host: string, title: string) =>
    (!!userHost && hostsMatch(host, userHost)) || nameAppears(businessName, title);

  const results: QueryResult[] = await Promise.all(queries.map(async query => {
    const r = await serp(auth, query);
    if (!r) return { query, ran: false, organic: [], paid: [], userRank: null, userPaidRank: null, aiOverview: null };

    const items = (r.items as Array<Record<string, unknown>>) || [];
    const toHit = (i: Record<string, unknown>): Hit => {
      const host = normalizeHost(String(i.url || i.domain || '')) || String(i.domain || '');
      const title = String(i.title || '');
      return { rank: Number(i.rank_group ?? 0), title, url: String(i.url || ''), host, isUser: mine(host, title) };
    };

    const organic = items.filter(i => i.type === 'organic').map(toHit);
    const paid = items.filter(i => i.type === 'paid').map(toHit);

    const aio = items.find(i => i.type === 'ai_overview');
    const aiOverview = aio
      ? (() => {
          const refs = (aio.references as Array<Record<string, unknown>>) || [];
          const sources = refs.map(ref => {
            const host = normalizeHost(String(ref.url || ref.domain || '')) || String(ref.domain || '');
            const title = String(ref.title || '');
            return { host, title, isUser: mine(host, title) };
          });
          return { cited: sources.some(s => s.isUser), sources };
        })()
      : null;

    const best = (hits: Hit[]) => hits.filter(h => h.isUser).map(h => h.rank).sort((a, b) => a - b)[0] ?? null;

    return { query, ran: true, organic, paid, userRank: best(organic), userPaidRank: best(paid), aiOverview };
  }));

  const ran = results.filter(r => r.ran);
  const withAio = ran.filter(r => r.aiOverview);

  return json(200, {
    ok: true,
    configured: true,
    source,
    city,
    userHost,
    businessName: businessName || null,
    queriesRun: ran.length,
    onPageOne: ran.filter(r => r.userRank != null).length,
    bestRank: ran.map(r => r.userRank).filter((n): n is number => n != null).sort((a, b) => a - b)[0] ?? null,
    aiOverviewsSeen: withAio.length,
    aiOverviewsCiting: withAio.filter(r => r.aiOverview!.cited).length,
    queries: results,
  });
};
