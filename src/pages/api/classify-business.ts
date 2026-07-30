import type { APIRoute } from 'astro';
import { BUSINESS_TYPES, bucketFor, keywordClassify } from '../../lib/business-types';

export const prerender = false;

// Classifies a free-text business description into one of the curated
// NAICS-derived small-business types (see src/lib/business-types.ts), which
// determines the readiness audit's question bucket. Uses DeepSeek v4 Pro
// via NVIDIA's API when NVIDIA_API_KEY is set; falls back to keyword rules
// otherwise so the audit always works.
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

  const apiKey = import.meta.env.NVIDIA_API_KEY;
  if (apiKey) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v4-pro',
          max_tokens: 60,
          temperature: 0,
          chat_template_kwargs: { thinking: false },
          messages: [
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
        }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const label = String(data?.choices?.[0]?.message?.content ?? '').trim();
        const bucket = bucketFor(label);
        if (bucket) return json(200, { ok: true, type: label, bucket, source: 'llm' });
      } else {
        console.error('classify-business: nvidia', res.status);
      }
    } catch (err) {
      console.error('classify-business threw:', err);
    }
  }

  const fb = keywordClassify(description);
  return json(200, { ok: true, type: fb.label, bucket: fb.bucket, source: 'fallback' });
};
