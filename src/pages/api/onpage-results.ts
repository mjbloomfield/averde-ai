import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { dfsAuth, dfsPost, firstResult } from '../../lib/dataforseo';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The deep crawl is posted when the lead is captured and takes a few minutes,
// so nothing can show it during the live audit. The report page asks for it
// when someone opens it — by then it has almost always finished. Results are
// written back to the row the first time they're complete, so the second
// viewing costs nothing.
export const POST: APIRoute = async ({ request }) => {
  let body: { reportId?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'bad_request' });
  }
  const id = (body.reportId || '').trim();
  if (!UUID.test(id)) return json(400, { ok: false, error: 'bad_request' });

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = dfsAuth();
  if (!supabaseUrl || !supabaseKey || !auth) return json(200, { ok: false, state: 'unavailable' });

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('audit_reports')
    .select('onpage, onpage_task_id')
    .eq('id', id)
    .single();

  if (error || !data) return json(404, { ok: false, state: 'not_found' });
  if (data.onpage) return json(200, { ok: true, state: 'ready', ...(data.onpage as object) });
  if (!data.onpage_task_id) return json(200, { ok: false, state: 'none' });

  const summary = firstResult(await dfsPost('on_page/summary', [{ id: data.onpage_task_id }], 20_000, auth));
  if (!summary) return json(200, { ok: false, state: 'unavailable' });
  if (summary.crawl_progress !== 'finished') {
    const crawled = (summary.crawl_status as Record<string, unknown>)?.pages_crawled ?? 0;
    return json(200, { ok: false, state: 'crawling', pagesCrawled: Number(crawled) });
  }

  const metrics = (summary.page_metrics as Record<string, unknown>) || {};
  const brokenLinks = Number(metrics.broken_links ?? 0);

  // Only ask for the list when the count says there is one.
  let examples: Array<{ from: string; to: string; status: number | null }> = [];
  if (brokenLinks > 0) {
    const links = firstResult(await dfsPost(
      'on_page/links',
      [{ id: data.onpage_task_id, limit: 25, filters: [['is_broken', '=', true]] }],
      20_000,
      auth,
    ));
    examples = (((links?.items as Array<Record<string, unknown>>) || []).map(i => ({
      from: String(i.page_from || ''),
      to: String(i.link_to || i.page_to || ''),
      status: i.page_to_status_code == null ? null : Number(i.page_to_status_code),
    })));
  }

  const payload = {
    pagesCrawled: Number((summary.crawl_status as Record<string, unknown>)?.pages_crawled ?? 0),
    onpageScore: Math.round(Number(metrics.onpage_score ?? 0)),
    brokenLinks,
    brokenResources: Number(metrics.broken_resources ?? 0),
    duplicateTitle: Number(metrics.duplicate_title ?? 0),
    duplicateDescription: Number(metrics.duplicate_description ?? 0),
    nonIndexable: Number(metrics.non_indexable ?? 0),
    linksInternal: Number(metrics.links_internal ?? 0),
    examples,
    checkedAt: new Date().toISOString(),
  };

  await supabase.from('audit_reports').update({ onpage: payload }).eq('id', id);
  return json(200, { ok: true, state: 'ready', ...payload });
};
