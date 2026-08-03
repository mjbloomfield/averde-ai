// Shared LLM access for the readiness-audit features: races all configured
// providers (NVIDIA pools are flaky — bodyless 404s when down; OpenRouter is
// the stable backstop) and returns the first successful completion.
type Provider = {
  name: string;
  url: string;
  key: string;
  model: string;
  extra: Record<string, unknown>;
  headers: Record<string, string>;
};

// OpenRouter's default routing picked a slow host for v4-pro (StreamLake,
// 49-59s on the full report prompt); sorting by throughput lands the same
// model on a fast one (BaseTen, 12-24s). Measured 2026-08-03 after a real
// lead timed out into canned recommendations.
const OR_ROUTING = { provider: { sort: 'throughput' } };

export function providers(): Provider[] {
  const nvidiaKey = import.meta.env.NVIDIA_API_KEY;
  const openrouterKey = import.meta.env.OPENROUTER_API_KEY;
  return [
    nvidiaKey && { name: 'nvidia/deepseek-v4-pro', url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: nvidiaKey, model: 'deepseek-ai/deepseek-v4-pro', extra: { chat_template_kwargs: { thinking: false } }, headers: {} },
    nvidiaKey && { name: 'nvidia/deepseek-v4-flash', url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: nvidiaKey, model: 'deepseek-ai/deepseek-v4-flash', extra: { chat_template_kwargs: { thinking: false } }, headers: {} },
    openrouterKey && { name: 'openrouter/deepseek-v4-pro', url: 'https://openrouter.ai/api/v1/chat/completions', key: openrouterKey, model: 'deepseek/deepseek-v4-pro', extra: OR_ROUTING, headers: { 'HTTP-Referer': 'https://averde.ai', 'X-Title': 'Averde AI Readiness Audit' } },
    openrouterKey && { name: 'openrouter/deepseek-v4-flash', url: 'https://openrouter.ai/api/v1/chat/completions', key: openrouterKey, model: 'deepseek/deepseek-v4-flash', extra: OR_ROUTING, headers: { 'HTTP-Referer': 'https://averde.ai', 'X-Title': 'Averde AI Readiness Audit' } },
    openrouterKey && { name: 'openrouter/deepseek-v3.1', url: 'https://openrouter.ai/api/v1/chat/completions', key: openrouterKey, model: 'deepseek/deepseek-chat-v3.1', extra: OR_ROUTING, headers: { 'HTTP-Referer': 'https://averde.ai', 'X-Title': 'Averde AI Readiness Audit' } },
  ].filter(Boolean) as Provider[];
}

export type ChatMessage = { role: 'system' | 'user'; content: string };

// Race every provider; `validate` turns raw text into a result or throws to
// disqualify that provider. Resolves with the first valid answer.
export async function raceChat<T>(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number },
  validate: (text: string) => T,
): Promise<{ result: T; provider: string } | null> {
  const list = providers();
  if (!list.length) return null;

  const attempts = list.map(async provider => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 6_500);
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
          max_tokens: opts.maxTokens ?? 60,
          temperature: opts.temperature ?? 0,
          ...provider.extra,
          messages,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`${provider.name} ${res.status}`);
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
      return { result: validate(text), provider: provider.name };
    } finally {
      clearTimeout(t);
    }
  });

  try {
    return await Promise.any(attempts);
  } catch (err) {
    if (err instanceof AggregateError) err.errors.forEach(e => console.error('raceChat:', String(e)));
    else console.error('raceChat threw:', err);
    return null;
  }
}

// Sequential, quality-first variant: try providers in the given order, each
// with its own timeout, and return the first valid answer. Used where output
// quality beats latency (report recommendations).
export async function seqChat<T>(
  order: Array<{ name: string; timeoutMs: number }>,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number },
  validate: (text: string) => T,
): Promise<{ result: T; provider: string } | null> {
  const byName = new Map(providers().map(p => [p.name, p]));
  for (const step of order) {
    const provider = byName.get(step.name);
    if (!provider) continue;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), step.timeoutMs);
    try {
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json', ...provider.headers },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: opts.maxTokens ?? 60,
          temperature: opts.temperature ?? 0,
          ...provider.extra,
          messages,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`${provider.name} ${res.status}`);
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
      return { result: validate(text), provider: provider.name };
    } catch (err) {
      console.error('seqChat:', provider.name, String(err).slice(0, 120));
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}
