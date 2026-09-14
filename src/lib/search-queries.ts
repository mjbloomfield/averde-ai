// Shared by the two visibility checks — Perplexity (/api/ai-visibility) and
// Google (/api/google-visibility). Both ask the same question of a different
// engine, so they have to ask it in the same words: if the query sets drifted,
// the report would be comparing two different searches.

export function normalizeHost(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function hostsMatch(a: string, b: string): boolean {
  const A = a.replace(/^www\./, '');
  const B = b.replace(/^www\./, '');
  return A === B || A.endsWith('.' + B) || B.endsWith('.' + A);
}

export function nameAppears(name: string, text: string): boolean {
  const n = name.trim();
  if (!n || n.length < 4) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

// Only bolt the audit's city onto a phrase that names no place at all.
// Testing for our own city isn't enough: someone serving two markets writes
// "firmware engineering in san francisco", and appending their home city
// produced "…in san francisco Boulder, CO" — a query no buyer would type.
const STATES = /\b(a[klrz]|c[aot]|d[ce]|fl|ga|hi|i[adln]|k[sy]|la|m[adeinost]|n[cdehjmvy]|o[hkr]|pa|ri|s[cd]|t[nx]|ut|v[at]|w[aivy])\b/i;
const namesAPlace = (k: string) =>
  /\b(in|near|around|serving|based)\s+\S/i.test(k) || /near me/i.test(k) || STATES.test(k);

export function buildQueries(args: {
  industry: string;
  city: string;
  keywords?: unknown;
  scope?: unknown;
  max: number;
}): { queries: string[]; source: 'keywords' | 'industry' } {
  const { industry, city, max } = args;

  // Prefer the user's own customer search phrases (step 2 of the form) — they
  // know what buyers actually type far better than an industry label.
  const rawKeywords = Array.isArray(args.keywords) ? args.keywords : [];
  const keywords = [...new Set(rawKeywords.map(k => String(k).trim()).filter(k => k.length > 2))].slice(0, 10);
  const cityToken = (city.split(/[\s,]+/)[0] || '').toLowerCase();

  // Scope comes from the form: near-me, nationwide, or both. A phrase that
  // already names a place is never rewritten under any scope — the buyer told
  // us where they meant.
  const scope = Array.isArray(args.scope) && args.scope.length ? (args.scope as string[]) : ['local'];
  const wantsLocal = scope.includes('local');
  const wantsNational = scope.includes('national');

  const variants = (k: string): string[] => {
    if (!cityToken || namesAPlace(k) || k.toLowerCase().includes(cityToken)) return [k];
    const out: string[] = [];
    if (wantsLocal) out.push(`${k} ${city}`);
    if (wantsNational) out.push(k);
    return out.length ? out : [k];
  };

  if (!keywords.length) {
    return {
      queries: [
        `best ${industry.toLowerCase()} in ${city}`,
        `${industry.toLowerCase()} ${city} recommendations`,
      ].slice(0, max),
      source: 'industry',
    };
  }

  // Round-robin by variant so the cap trims second variants rather than
  // dropping a phrase the owner typed.
  const perPhrase = keywords.map(variants);
  const widest = Math.max(0, ...perPhrase.map(v => v.length));
  const queries = Array.from({ length: widest })
    .flatMap((_, i) => perPhrase.map(v => v[i]).filter(Boolean))
    .slice(0, max);

  return { queries, source: 'keywords' };
}
