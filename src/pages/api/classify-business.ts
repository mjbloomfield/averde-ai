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

  // Race all providers; first valid on-list label wins. A serial chain
  // could take 3x8s while the widget aborts at ~7s — the race answers in
  // whatever the fastest healthy provider takes.
  if (providers.length) {
    const attempts = providers.map(async provider => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6_500);
      try {
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
        if (!res.ok) throw new Error(`${provider.name} ${res.status}`);
        const data = await res.json();
        const label = String(data?.choices?.[0]?.message?.content ?? '').trim();
        const bucket = bucketFor(label);
        if (!bucket) throw new Error(`${provider.name} off-list: ${label.slice(0, 60)}`);
        return { label, bucket, provider: provider.name };
      } finally {
        clearTimeout(t);
      }
    });
    try {
      const win = await Promise.any(attempts);
      return json(200, { ok: true, type: win.label, bucket: win.bucket, source: 'llm', model: win.provider });
    } catch (err) {
      if (err instanceof AggregateError) err.errors.forEach(e => console.error('classify-business:', String(e)));
      else console.error('classify-business race threw:', err);
    }
  }

  const fb = keywordClassify(description);
  return json(200, { ok: true, type: fb.label, bucket: fb.bucket, source: 'fallback' });
};
