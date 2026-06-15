# Averde AI — repo context for Claude Code

This file is auto-loaded every Claude Code session in this repo. Update it
as voice patterns emerge from Mark's edits.

## What this project is

Averde AI is Mark Bloomfield's solo consultancy. The site (this repo) is the
top of his funnel: free 3-minute AI Readiness Audit → 30-min strategy call
→ paid engagements (AI-Ready Website rebuild $1,200+, Strategy Sessions
$250-$500, Voice Agent, Custom AI builds).

The repositioning we did in May 2026 made **AI-Ready Website** the flagship
service (was previously Voice Agent). Marketing centers on the gap: most
small businesses are invisible to ChatGPT, Perplexity, and Google AI Overviews
— and that's where their next customers are starting their search.

Stack: Astro 6 (output: 'static' + Vercel adapter for SSR routes) + Tailwind 4
(via @tailwindcss/postcss; theme still in tailwind.config.mjs, loaded with
`@config` in global.css) + Keystatic CMS (cloud storage) + Supabase
(audit_leads table) + Resend (email) + Vercel (deploys). Node 24.

---

## Mark's voice — initial observations

This section will be expanded as I see edits. Initial baselines from existing
home.yaml + industry pages + this CLAUDE.md style:

- **Smart-casual, founder-led.** First person ("I", "I'll", "we'll" only when
  there's a real "we"). Mark is the company.
- **Plain English. Zero jargon unless absolutely necessary, and then
  defined inline.** "AEO — Answer Engine Optimization. In plain English: ..."
- **Anti-hype.** Calls out the hype directly when relevant. Doesn't trend-chase.
- **Specific over general.** Concrete dollar figures, real timelines, real
  examples. "$1,200–$3,000" beats "competitively priced."
- **Direct.** Short paragraphs. Strong claim at the start of each section.
  Reader knows what's coming before reading the supporting copy.
- **Comfortable with vulnerability/honesty.** "Won't do those '10 best where
  I'm one of the ten' articles" → call out sleazy moves by name, including
  if our own service has limits.
- **Light humor, never forced.** Self-aware over self-important.

### Words/phrases Mark uses (from existing copy)
- "your front desk" / "your team" (vs "your employees")
- "actually" — used precisely, never as filler
- "the math is clear" / "the math"
- "stop letting X become Y" (rhetorical structure)
- "no fluff" / "no jargon" / "no pressure"
- "honest pricing" / "honest take"
- "fit your business" / "fit how you work"

### Words/phrases Mark probably wouldn't use (to verify via edits)
- "leverage" (verb)
- "synergy", "ecosystem"
- "revolutionize", "transform" (over-promising)
- "best-in-class"
- "world-class"
- "thought leader"
- Hedge words ("might," "could," "potentially") when a direct claim is better

### Structural patterns to keep using
- Open with a concrete scenario, not a thesis statement
- Direct claims as section openers, then explanation
- "Three things, in order of X" — numbered, ranked, opinionated
- Honest acknowledgment of what something *isn't* (defensive prose)
- Closing with the strategic/urgency point, not a wishy-washy summary

### Voice patterns confirmed by post #1 edits (May 2026)

- **"Make sure..." imperatives** for parallel numbered/bulleted list headings.
  Talks TO the reader instead of lecturing about an abstract.
- **Claude first** when listing AI engines; ChatGPT/Perplexity/Gemini after.
  Mark's brand, Mark's call.
- **Cinematic openers welcome.** "Scene:" as a screenplay direction is on-brand.
- **Smooth out abrupt fragments.** "Different game." → "It's just a different game."
  Mark doesn't trust punch-fragment style; prefers conversational completeness.
- **Conversational connectors at section breaks** — "So,", "It's just",
  "Beyond the...". Don't open sections with bare nouns when a connector reads warmer.
- **Mechanism over psychology** when explaining why people get things wrong.
  Don't attribute to reader self-flattery ("they think because they use AI...");
  explain the actual technical reason ("AEO uses different signals than SEO").
- **Honest hedges on numbers.** Prefer "+" suffixes on prices, "a couple weeks"
  over precise ranges when the range is fuzzy. Don't overclaim.
- **Parenthetical self-include.** "(which we all should be doing anyway)" pattern.
  Pulls Mark into the reader's situation instead of standing above it.
- **Repeat the brand term as a payoff line.** "Your site wasn't AI Ready."
  reinforces the title, doesn't just gesture at it.
- **No "slick", "slicker", or trendy descriptors.** "Professional" / "polished"
  when that meaning is needed.
- **Drop qualifier hedges from sharp claims.** "AI didn't know you existed in a
  form it could recommend" → "AI didn't even know you existed." Crisp claim
  beats copywriter-hedged claim.
- **Cut speculative moats.** Don't claim multi-year head starts or citation
  graphs that "settle." If you can't prove the duration, soften ("leg up").
  Mark called out this exact overclaim in the post #1 review.
- **Avoid the three-short-declaratives-plus-closer rhythm.** "The tools
  existed. The use cases were real. But nobody was translating it. So I
  started doing that work." reads as LLM rhythm even when the meaning is
  fine. Collapse those runs into one flowing sentence with commas or
  em-dashes ("The tools and use cases were real, but nobody was
  translating any of it — so I started doing that work myself"). Same
  fix for paired fragment closers like "Based in Boulder. Working
  nationwide." → "I'm based in Boulder, working with businesses
  nationwide." Mark called this out by name as "AI speak."

---

## Blog post workflow

### How to write a new post

1. Mark says "write blog post idea N" (or describes a topic)
2. I draft the post in `src/content/blog/<slug>.mdoc` with proper Keystatic
   frontmatter (title, excerpt, category, publishedDate, author,
   seoDescription)
3. I copy the same draft into `/blog-drafts/<NN>-<slug>-claude-draft.md`
4. I copy the same draft into `/blog-drafts/<NN>-<slug>-mark-edited.md` as
   Mark's editable starting point
5. Mark opens both in VS Code split panes and edits the right side
6. When done, Mark either:
   - Pastes the edited markdown into Keystatic UI and publishes, OR
   - Copies the edited body into the `.mdoc` file directly and commits

### How to train me on edits

After Mark edits a post, he says:

> **"I've edited post NN — read both versions in /blog-drafts and update CLAUDE.md."**

I then:
1. Read both `<NN>-*-claude-draft.md` and `<NN>-*-mark-edited.md`
2. Diff them mentally
3. Add new observations to the "Mark's voice" section above (specific
   patterns: words swapped, structures changed, things removed)
4. The next post I draft pulls from these patterns automatically since this
   file is in every session's context

### Scheduling posts

Set `publishedDate` to a future date in Keystatic. The blog index
(src/pages/blog/index.astro) and the slug route (src/pages/blog/[slug].astro)
both filter by `publishedDate <= now`. Future-dated posts stay invisible
until that date passes AND the site is rebuilt. Rebuilds happen on every
git push, so as long as you commit something at least weekly, scheduled
posts auto-go-live within ~7 days of their date.

If you want strict "publishes at 9am Tuesday" precision without manual
deploys: add a Vercel daily cron that pings `/api/rebuild`. Hobby plan
gives you 2 cron jobs free. Not needed yet.

---

## Reference: Claude products (distinct things — don't conflate)

- **Claude (chat)** — assistant at claude.ai / mobile + desktop apps.
  Conversation: you ask, it answers.
- **Claude Code** — developer tool in the **terminal (CLI)**. Reads/edits
  files, runs commands, deploys, talks to GitHub/Supabase/etc. For
  project/coding work. This site was built with it.
- **Claude Cowork** — Anthropic's agentic AI for **non-technical** knowledge
  work, in the **Claude desktop app** (no terminal). GA February 2026 —
  *after the Jan-2026 training cutoff, so verify specifics against
  claude.com/product/cowork instead of relying on memory.* On all paid
  plans. Flow: describe an outcome → Claude shows a plan → you approve → it
  executes autonomously over the local files/folders + connected apps you
  grant. Does file organization, data extraction (receipts/invoices →
  spreadsheets), report generation, scheduled recurring tasks, cross-app
  workflows. Essentially "Claude Code power, without the terminal."
- **CLAUDE.md** — the context file at a project root that Claude Code reads
  each session (voice rules, conventions, what not to touch). This file is
  the example.

---

## Other repo conventions (for future sessions)

- Path aliases: none configured; use relative imports
- Build target: `output: 'static'` — most pages prerendered; API routes opt
  into SSR with `export const prerender = false`. (Was `'hybrid'`, which Astro 5
  removed — `'static'` now covers the same prerender-by-default behavior.)
- Astro content collections: Content Layer API in `src/content.config.ts` —
  `blog` (glob loader over `*.mdoc`) and `industries` (glob loader over
  `*.yaml`). Use `entry.id` (not `.slug`) and `render(entry)` (not
  `entry.render()`).
- Keystatic: cloud storage (`storage: { kind: 'cloud' }`),
  project = `averde-ai/averde-ai`. The `keystatic()` integration injects the
  `/keystatic` + `/api/keystatic` routes — don't add manual route files (Astro
  6 errors on duplicate SSR routes).
- Image optimization: manual via `sips` (no Astro `<Image>` yet — CSS
  background-images can't use it). When adding hero photos, compress them
  before commit. Target: <300KB per image.
- Schema markup: full @graph in `src/components/SEOHead.astro` (every page)
- Sitemap: dynamic at `/sitemap.xml` from `src/pages/sitemap.xml.ts`
- All blog posts should be ~1,200-1,800 words and AEO-shaped (direct
  answer-first paragraphs, FAQ-style sections, real numbers/examples)

---

## TODO.md — running task list

`TODO.md` at the repo root is the single source of truth for what's planned, what's been done, and what's been deferred on this project. Maintain it on every working session.

**Structure:**

- **`## To do`** — the active list. Top of the list = next thing to work on. New deferred items append to the bottom.
- **`## Project log`** — completed work with a one-line summary per item, appended chronologically (oldest at the top, newest at the bottom). Reads as a log of the project's history. Don't write detail — the git history has that. Just enough that someone reading TODO.md can see the arc of what's shipped.

**Workflow:**

- **Starting a task:** open `TODO.md`, pick the top item, work on it.
- **Finishing a task:** move it from `## To do` to the bottom of `## Project log`, rewriting it as one short past-tense sentence with the commit hash if available. Example: `- 2026-05-27 — added noindex env-gate, replaced placeholder content, stripped dev image captions (4293ac8).`
- **Substantive ad-hoc work (bug fixes, surprise requests, things that weren't in `## To do` first) also gets appended to `## Project log`.** The log captures everything substantive that ships, not just pre-planned tasks. If a task was never on the To do list because it surfaced mid-session, log it anyway.
- **Deferring a task:** move it to the bottom of `## To do`. If the reason for deferral matters, add a one-line note (e.g., `(waiting on client to provide profile URLs)`).
- **Adding a new task:** insert at the right priority point in `## To do`, or at the bottom if not urgent.

**What goes in TODO.md:**

- Phase-level work from the active plan
- Punch-list items discovered mid-phase
- Bugs / regressions
- Things waiting on the client or a third party
- One-off requests that came up in conversation but weren't done immediately

**What doesn't go in TODO.md:**

- Step-by-step implementation details (that's a plan file or just thinking)
- Personal preferences / voice rules (those belong in this CLAUDE.md)
- Long-form documentation (those belong in their own files)
- Trivial doc/typo tweaks — keep the log focused on substantive work

The point: a future Claude session opens `TODO.md` and knows in 60 seconds what's next, what's blocked, and what's already shipped.
