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

Stack: Astro 4 (hybrid output) + Tailwind + Keystatic CMS + Supabase
(audit_leads table) + Resend (email) + Vercel (deploys).

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

## Other repo conventions (for future sessions)

- Path aliases: none configured; use relative imports
- Build target: `output: 'hybrid'` — most pages prerendered, API routes
  and a few SSR pages are server-rendered
- Astro content collections: `blog` (markdown) and `industries` (data/yaml)
- Keystatic: cloud storage (`storage: { kind: 'cloud' }`),
  project = `averde-ai/averde-ai`
- Image optimization: manual via `sips` (no Astro `<Image>` yet — CSS
  background-images can't use it). When adding hero photos, compress them
  before commit. Target: <300KB per image.
- Schema markup: full @graph in `src/components/SEOHead.astro` (every page)
- Sitemap: dynamic at `/sitemap.xml` from `src/pages/sitemap.xml.ts`
- All blog posts should be ~1,200-1,800 words and AEO-shaped (direct
  answer-first paragraphs, FAQ-style sections, real numbers/examples)
