import type { APIRoute } from 'astro';
import { seqChat } from '../../lib/llm';

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
  stage?: number;
  stageLabel?: string;
  nextStage?: { n?: number; label?: string; what?: string } | null;
  teamShare?: string;
  appetite?: string;
  worry?: string;
};

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function parseMoves(text: string): Move[] {
  const stripped = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in reply');
  let parsed: { moves?: unknown };
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    // Models occasionally truncate mid-array. Salvage every complete move
    // object rather than discarding the whole reply.
    const objs = [...stripped.matchAll(/\{[^{}]*"title"[^{}]*\}/g)].map(m => {
      try { return JSON.parse(m[0]); } catch { return null; }
    }).filter(Boolean);
    if (!objs.length) throw new Error('unrecoverable JSON');
    parsed = { moves: objs };
  }
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
- The FIRST move must be a concrete step toward their next stage on the adoption path (given below), translated into this business's world. The other two moves target where their hours go.
- Under-promise, always. Say "can", "often", "worth testing" — never "will", never promised savings, percentages, or outcomes.
- Every move must be relevant to THIS business type. Never mention work this kind of business doesn't do.
- Size each move to the time they said they can invest. If they said under 2 hours a week, no move may need more than that to start.
- If this is a team (not "Just me"), write for the company — "your team", "your front desk" — and if few of the team use AI, at least one move should be about getting one more person productive with it, not just the owner.
- Use the tools they already named where possible. Do not tell them to buy new software.
- Only mention a named tool if you are confident what it actually does and your suggestion fits that role. Getting a tool's role wrong is worse than not mentioning it — when unsure, refer to their documents or clients instead of the tool.
- If they flagged a hesitation (privacy, cost, time, etc.), the most-relevant move must address it head-on in plain terms.
- Plain English. No buzzwords (leverage, transform, revolutionize, seamless, game-changing, unlock, empower). No exclamation points. No "it's not X, it's Y" constructions.
- Be specific to THIS business or don't ship it: every move's title or firstStep must name something only this business would recognize — a tool they listed, their kind of document or client, their own words from the description. If a title could appear in any small business's report, rewrite it until it can't.
- Every "why" must cite at least one concrete answer of theirs (an hours figure, a named tool, their storage setup).
- Each move: "title" (max 8 words, direct), "why" (1–2 sentences that reference their actual answers), "firstStep" (one concrete action doable this week), "callNote" (one sentence on what we would dig into together on the free 30-minute call).
- Keep the entire reply under 250 words. Short beats thorough here.

Reply with strict JSON only: {"moves":[{"title":"","why":"","firstStep":"","callNote":""}, ...exactly 3 items]}`;

  const user = `Business: ${p.businessName || 'unnamed'} — ${p.businessType || 'small business'} (${p.teamSize || 'size unknown'})
Owner's own description: "${clean(p.businessDescription, 300)}"

Where their week goes:
${hourLines}

Systems: business info lives in ${p.storage || 'unknown'}; email/calendar is ${p.platform || 'unknown'}${p.otherTools ? `; other tools: ${clean(p.otherTools, 120)}` : ''}
AI adoption stage: ${p.stage ?? '?'} of 5 (${p.stageLabel || 'unknown'})${p.nextStage ? `; their next step on the path is Stage ${p.nextStage.n} — ${p.nextStage.label}: ${p.nextStage.what}` : ' — they are at the top of the path'}${p.teamShare ? `; share of team using AI regularly: ${p.teamShare}` : ''}
Time they can invest in setup: ${p.appetite || 'unknown'} hours/week
Biggest hesitation: ${p.worry || 'none stated'}`;

  // Quality-first, per Mark's model comparison (2026-07-30): v4-pro via
  // OpenRouter reasons internally and grounds tool use correctly; the fast
  // tiers are fallbacks. NVIDIA's preview pools are excluded here — too
  // flaky for a 30-second generation (they stay in the classification race).
  //
  // Budgets (2026-08-03): pro usually lands in 28-46s but a slow OpenRouter
  // moment blew past the old 50s cap and dropped a real lead to canned. Pro
  // now gets 65s. v3.1 is the only fallback because it's the one non-reasoning
  // model — flash reasons too, so it could never finish in the leftover window.
  const win = await seqChat(
    [
      { name: 'openrouter/deepseek-v4-pro', timeoutMs: 65_000 },
      { name: 'openrouter/deepseek-v3.1', timeoutMs: 25_000 },
    ],
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { maxTokens: 3000, temperature: 0.3 },
    parseMoves,
  );

  if (win) return json(200, { ok: true, moves: win.result, source: 'llm', model: win.provider });
  return json(200, { ok: true, moves: [], source: 'none' });
};
