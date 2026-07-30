import type { APIRoute } from 'astro';
import { raceChat } from '../../lib/llm';

export const prerender = false;

// Generates the readiness report's "top 3 moves" from the full survey —
// personalized to the classified business type and the owner's actual
// answers, with hard under-promise guardrails. The widget falls back to
// its canned per-bucket cards if this returns nothing.
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Move = { title: string; why: string; firstStep: string; callNote: string };

type Payload = {
  businessName?: string;
  businessDescription?: string;
  businessType?: string;
  bucket?: string;
  teamSize?: string;
  hours?: Record<string, string>;
  hourLabels?: Record<string, string>;
  storage?: string;
  platform?: string;
  otherTools?: string;
  usage?: string;
  depth?: string;
  appetite?: string;
  worry?: string;
};

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function parseMoves(text: string): Move[] {
  const stripped = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in reply');
  const parsed = JSON.parse(stripped.slice(start, end + 1));
  const moves = Array.isArray(parsed?.moves) ? parsed.moves : [];
  const out = moves
    .map((m: Record<string, unknown>) => ({
      title: clean(m.title, 80),
      why: clean(m.why, 320),
      firstStep: clean(m.firstStep, 400),
      callNote: clean(m.callNote, 220),
    }))
    .filter((m: Move) => m.title && m.why && m.firstStep);
  if (out.length < 2) throw new Error('too few valid moves');
  return out.slice(0, 3);
}

export const POST: APIRoute = async ({ request }) => {
  let p: Payload;
  try {
    p = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json' });
  }

  const hourLines = Object.entries(p.hours ?? {})
    .filter(([, v]) => v && v !== '0')
    .map(([k, v]) => `- ${(p.hourLabels ?? {})[k] || k}: ${v} hrs/week`)
    .join('\n') || '- (they reported almost no repetitive admin time)';

  const system = `You write the "top 3 moves" section of an AI-readiness report that a small business owner reads right after a self-assessment. You write as Mark Bloomfield, a plain-English AI consultant.

Hard rules — every one of them matters:
- Under-promise, always. Say "can", "often", "worth testing" — never "will", never promised savings, percentages, or outcomes.
- Every move must be relevant to THIS business type. Never mention work this kind of business doesn't do.
- Size each move to the time they said they can invest. If they said under 2 hours a week, no move may need more than that to start.
- Use the tools they already named where possible. Do not tell them to buy new software.
- If they flagged a hesitation (privacy, cost, time, etc.), the most-relevant move must address it head-on in plain terms.
- Plain English. No buzzwords (leverage, transform, revolutionize, seamless, game-changing, unlock, empower). No exclamation points. No "it's not X, it's Y" constructions.
- Each move: "title" (max 8 words, direct), "why" (1–2 sentences that reference their actual answers), "firstStep" (one concrete action doable this week), "callNote" (one sentence on what we would dig into together on the free 30-minute call).
- Keep the entire reply under 250 words. Short beats thorough here.

Reply with strict JSON only: {"moves":[{"title":"","why":"","firstStep":"","callNote":""}, ...exactly 3 items]}`;

  const user = `Business: ${p.businessName || 'unnamed'} — ${p.businessType || 'small business'} (${p.teamSize || 'size unknown'})
Owner's own description: "${clean(p.businessDescription, 300)}"

Where their week goes:
${hourLines}

Systems: business info lives in ${p.storage || 'unknown'}; email/calendar is ${p.platform || 'unknown'}${p.otherTools ? `; other tools: ${clean(p.otherTools, 120)}` : ''}
AI today: uses AI ${p.usage || 'unknown'}${p.depth ? `, mostly for ${p.depth}` : ''}
Time they can invest in setup: ${p.appetite || 'unknown'} hours/week
Biggest hesitation: ${p.worry || 'none stated'}`;

  const win = await raceChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { maxTokens: 700, temperature: 0.4, timeoutMs: 25_000 },
    parseMoves,
  );

  if (win) return json(200, { ok: true, moves: win.result, source: 'llm', model: win.provider });
  return json(200, { ok: true, moves: [], source: 'none' });
};
