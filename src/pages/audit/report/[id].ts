import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// Serves the stored web copy of an emailed Website Audit Report.
// Rows are written by /api/audit-lead; the unguessable UUID is the
// only access control, so keep these pages out of search indexes.

// The stored HTML is the email body: table-based, inline styles, no <head>.
// The wrapper below is added only on the web copy, so the emailed version
// stays exactly as email clients expect. It gives the page a print layout,
// which is how a lead gets a PDF — every browser's print dialog saves one,
// with no PDF library on our side.
const wrap = (body: string, reportId: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Website Audit Report — Averde AI</title>
<style>
  body { margin:0; background:#F4ECDB; }
  .bar {
    position:sticky; top:0; z-index:10; display:flex; flex-wrap:wrap; gap:12px;
    align-items:center; justify-content:space-between;
    padding:12px 20px; background:#2A1B11; color:#F4ECDB;
    font:500 13px/1.4 'Helvetica Neue',Arial,sans-serif;
  }
  .bar a { color:#E8C896; }
  .bar-actions { display:flex; gap:10px; }
  .bar button {
    font:600 13px/1 'Helvetica Neue',Arial,sans-serif; cursor:pointer;
    padding:9px 15px; border-radius:8px; border:1px solid #C99356;
    background:#C99356; color:#2A1B11;
  }
  .bar button.ghost { background:transparent; color:#F4ECDB; }
  .bar button:focus-visible { outline:2px solid #F4ECDB; outline-offset:2px; }
  #rerun-out, #onpage-out {
    max-width:680px; margin:0 auto; padding:0 20px;
    font:400 14px/1.6 'Helvetica Neue',Arial,sans-serif; color:#4F3522;
  }
  #rerun-out ul, #onpage-out ul { margin:8px 0 0; padding-left:20px; }
  #onpage-out .card {
    background:#FFFDF6; border:1px solid rgba(42,27,17,.12); border-radius:10px;
    padding:14px 18px; margin:14px 0 0;
  }
  #onpage-out h3 { font:600 14px/1.3 'Helvetica Neue',Arial,sans-serif; margin:0 0 6px; color:#2A1B11; }
  #onpage-out code { font:12px ui-monospace,Menlo,monospace; word-break:break-all; }

  @page { margin:14mm 12mm; }
  @media print {
    .bar, #rerun-out { display:none !important; }
    body { background:#fff; }
    /* Keep a check and its fix note together rather than split across a page. */
    tr, table { break-inside:avoid; page-break-inside:avoid; }
    a[href^="http"]::after { content:" (" attr(href) ")"; font-size:10px; color:#6B7280; word-break:break-all; }
  }
</style>
</head>
<body>
  <div class="bar">
    <span>Your Website Audit Report · <a href="https://averde.ai">Averde AI</a></span>
    <span class="bar-actions">
      <button type="button" class="ghost" id="rerun">Re-run these checks</button>
      <button type="button" id="print">Save as PDF</button>
    </span>
  </div>
  <div id="rerun-out"></div>
  <div id="onpage-out"></div>
  ${body}
<script>
  document.getElementById('print').addEventListener('click', () => window.print());

  // The deep crawl was started when this report was generated. By the time
  // anyone opens the page it has normally finished; if not, say so plainly
  // rather than showing an empty section.
  (async () => {
    const out = document.getElementById('onpage-out');
    try {
      const res = await fetch('/api/onpage-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: ${JSON.stringify(reportId)} }),
      });
      const d = await res.json();
      if (d.state === 'crawling') {
        out.innerHTML = '<div class="card"><h3>Deeper crawl still running</h3>' +
          '<p>We\u2019re checking up to 100 pages for broken links and duplicate content (' + (d.pagesCrawled || 0) +
          ' done so far). Reload this page in a few minutes.</p></div>';
        return;
      }
      if (d.state !== 'ready') return;

      const lines = [];
      lines.push(d.brokenLinks === 0
        ? 'No broken links found across the ' + d.pagesCrawled + ' pages we crawled.'
        : d.brokenLinks + ' broken link' + (d.brokenLinks === 1 ? '' : 's') + ' across ' + d.pagesCrawled + ' pages.');
      if (d.brokenResources) lines.push(d.brokenResources + ' broken image or file reference' + (d.brokenResources === 1 ? '' : 's') + '.');
      if (d.duplicateTitle) lines.push(d.duplicateTitle + ' pages share a title with another page.');
      if (d.duplicateDescription) lines.push(d.duplicateDescription + ' pages share a description with another page.');
      if (d.nonIndexable) lines.push(d.nonIndexable + ' pages are marked so search engines will not index them. Some of that is normal; worth a look if the number is large.');

      const examples = (d.examples || []).slice(0, 8).map(e =>
        '<li><code>' + e.to + '</code> &mdash; linked from <code>' + e.from + '</code>' +
        (e.status ? ' (' + e.status + ')' : '') + '</li>').join('');

      out.innerHTML = '<div class="card"><h3>Deeper crawl \u2014 ' + d.pagesCrawled + ' pages</h3><ul>' +
        lines.map(l => '<li>' + l + '</li>').join('') + '</ul>' +
        (examples ? '<p style="margin-top:10px">Broken links found:</p><ul>' + examples + '</ul>' : '') +
        '</div>';
    } catch { /* the report is still complete without this section */ }
  })();

  const btn = document.getElementById('rerun');
  const out = document.getElementById('rerun-out');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Re-checking your site…';
    out.innerHTML = '';
    try {
      const res = await fetch('/api/audit-rerun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: ${JSON.stringify(reportId)} }),
      });
      const data = await res.json();
      if (!data.ok) {
        out.innerHTML = '<p>' + (data.message || 'We couldn\\u2019t re-check the site just now. Try again in a minute.') + '</p>';
      } else if (!data.changes.length) {
        out.innerHTML = '<p><strong>Nothing has changed since ' + data.since + '.</strong> The report below still describes your site.</p>';
      } else {
        out.innerHTML = '<p><strong>What changed since ' + data.since + ':</strong></p><ul>' +
          data.changes.map(c => '<li>' + c + '</li>').join('') + '</ul>' +
          '<p>The report below is the original run, kept for comparison.</p>';
      }
    } catch {
      out.innerHTML = '<p>We couldn\\u2019t re-check the site just now. Try again in a minute.</p>';
    }
    btn.textContent = label;
    btn.disabled = false;
  });
</script>
</body>
</html>`;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id || '';
  const notFound = new Response('Report not found', { status: 404 });

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return notFound;

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return notFound;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('audit_reports').select('html').eq('id', id).single();
  if (error || !data?.html) return notFound;

  return new Response(wrap(data.html, id), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, max-age=0',
    },
  });
};
