import type { APIRoute } from 'astro';

export const prerender = false;

type Scores = {
  overall?: number;
  grade?: string;
  visibility?: number;
  stack?: number;
  opportunity?: number;
};

type Opportunity = {
  rank?: string;
  title?: string;
  service?: string;
  effort?: string;
  invest?: string;
  why?: string;
};

type AuditPayload = {
  name?: string;
  email?: string;
  website?: string;
  industry?: string;
  city?: string;
  keywords?: string;
  tools?: Record<string, string | null>;
  pains?: string[];
  goal?: string;
  scores?: Scores;
  opportunities?: Opportunity[];
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: AuditPayload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim();
  const industry = (payload.industry || '').trim();

  if (!email) return json(400, { ok: false, error: 'missing_email' });

  const apiKey = import.meta.env.SENDGRID_API_KEY;
  if (!apiKey) return json(500, { ok: false, error: 'config' });

  const s = payload.scores || {};
  const ops = (payload.opportunities || []).slice(0, 3);
  const topOps = ops
    .map((o, i) => `  ${i + 1}. ${o.title || '(untitled)'}${o.service ? ` — ${o.service}` : ''}`)
    .join('\n');

  const lines: string[] = [
    `Name: ${name || '(not given)'}`,
    `Email: ${email}`,
    payload.website ? `Website: ${payload.website}` : '',
    `Industry: ${industry || '(not given)'}`,
    payload.city ? `City: ${payload.city}` : '',
    payload.goal ? `Stated goal: ${payload.goal}` : '',
    '',
    `Overall AI Readiness: ${s.grade ?? '?'} (${s.overall ?? '?'} / 100)`,
    `  · AI Search Visibility: ${s.visibility ?? '?'}`,
    `  · Stack Maturity:        ${s.stack ?? '?'}`,
    `  · Opportunity Density:   ${s.opportunity ?? '?'}`,
    '',
    'Top 3 opportunities:',
    topOps || '  (none returned)',
    '',
    '— Full payload below —',
    '',
    JSON.stringify(payload, null, 2),
  ].filter(Boolean);

  const text = lines.join('\n');
  const subject = `Averde AI Audit Lead: ${name || 'Anonymous'} (${industry || 'unknown'})`;

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'mark@averde.ai', name: 'Mark Bloomfield' }] }],
        from: { email: 'mark@averde.ai', name: 'Averde AI Audit' },
        reply_to: { email, name: name || email },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });

    if (!res.ok) return json(500, { ok: false, error: 'send' });
  } catch {
    return json(500, { ok: false, error: 'send' });
  }

  return json(200, { ok: true });
};
