import type { APIRoute } from 'astro';
import { BUSINESS_TYPES, bucketFor, keywordClassify } from '../../lib/business-types';
import { raceChat } from '../../lib/llm';

export const prerender = false;

// Classifies a free-text business description into one of the curated
// NAICS-derived small-business types (see src/lib/business-types.ts), which
// determines the readiness audit's question bucket. Races the configured
// LLM providers (src/lib/llm.ts); falls back to keyword rules so the audit
// always works.
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  let body: { description?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const description = (body.description || '').trim().slice(0, 300);
  if (description.length < 3) return json(400, { ok: false, error: 'missing_description' });

  const win = await raceChat(
    [
      {
        role: 'system',
        content:
          'You classify small businesses into exactly one type from a fixed list. Reply with the single best-matching type label, copied verbatim from the list. Reply with the label only — no punctuation, no explanation.',
      },
      {
        role: 'user',
        content: `Business${body.name ? ` "${body.name}"` : ''} described by its owner as: "${description}"\n\nTypes:\n${BUSINESS_TYPES.map(x => x.label).join('\n')}`,
      },
    ],
    { maxTokens: 60, temperature: 0 },
    text => {
      const bucket = bucketFor(text);
      if (!bucket) throw new Error(`off-list: ${text.slice(0, 60)}`);
      return { label: text.trim(), bucket };
    },
  );
  if (win) return json(200, { ok: true, type: win.result.label, bucket: win.result.bucket, source: 'llm', model: win.provider });

  const fb = keywordClassify(description);
  return json(200, { ok: true, type: fb.label, bucket: fb.bucket, source: 'fallback' });
};
