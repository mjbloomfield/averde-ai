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

  // Provider chain: NVIDIA pro -> NVIDIA flash -> OpenRouter -> keyword
  // rules. NVIDIA's per-model pools come and go (bodyless 404s when a pool
  // is down); OpenRouter is the paid-but-stable backstop.
  const nvidiaKey = import.meta.env.NVIDIA_API_KEY;
  const openrouterKey = import.meta.env.OPENROUTER_API_KEY;
  const providers = [
    nvidiaKey && { name: 'nvidia/deepseek-v4-pro', url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: nvidiaKey, model: 'deepseek-ai/deepseek-v4-pro', extra: { chat_template_kwargs: { thinking: false } }, headers: {} },
    nvidiaKey && { name: 'nvidia/deepseek-v4-flash', url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: nvidiaKey, model: 'deepseek-ai/deepseek-v4-flash', extra: { chat_template_kwargs: { thinking: false } }, headers: {} },
    openrouterKey && { name: 'openrouter/deepseek-v4-flash', url: 'https://openrouter.ai/api/v1/chat/completions', key: openrouterKey, model: 'deepseek/deepseek-v4-flash', extra: {}, headers: { 'HTTP-Referer': 'https://averde.ai', 'X-Title': 'Averde AI Readiness Audit' } },
  ].filter(Boolean) as Array<{ name: string; url: string; key: string; model: string; extra: Record<string, unknown>; headers: Record<string, string> }>;

  {
    for (const provider of providers) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8_000);
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.key}`,
            'Content-Type': 'application/json',
            ...provider.headers,
          },
          body: JSON.stringify({
            model: provider.model,
            max_tokens: 60,
            temperature: 0,
            ...provider.extra,
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
          if (bucket) return json(200, { ok: true, type: label, bucket, source: 'llm', model: provider.name });
          console.error('classify-business: off-list label from', provider.name, label.slice(0, 60));
        } else {
          console.error('classify-business:', provider.name, res.status);
        }
      } catch (err) {
        console.error('classify-business threw:', err);
      }
    }
  }

  const fb = keywordClassify(description);
  return json(200, { ok: true, type: fb.label, bucket: fb.bucket, source: 'fallback' });
};
