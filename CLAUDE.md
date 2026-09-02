# Averde AI — repo context for Claude Code

This file is auto-loaded every Claude Code session in this repo. Update it
as voice patterns emerge from Mark's edits.

## What this project is

Averde AI is Mark Bloomfield's solo consultancy. The site (this repo) is the
top of his funnel: free 3-minute AI Readiness Audit → 30-min strategy call
→ paid engagements (AI-Ready Website rebuild $1,500+, Strategy Sessions
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

## Mark's voice

One unified guide, folded together from Mark's edit passes (May–July 2026).
When a new edit pass teaches something, fold it in here where it belongs —
don't append dated sections. Principles outrank examples; the examples are
evidence, not extra rules.

### Who's talking
- Founder, first person. "I", not "we" (unless there's a real we). Smart-casual,
  self-aware over self-important, light humor never forced.
- Talking to non-technical small-business owners. If the reader can't act on a
  detail, cut it (the Linux aside, "CLAUDE.md", "built in the Code tab" all
  died for this reason). Insider terms get translated or dropped.

### Core principles
1. **Plain English, zero jargon.** Necessary terms get defined inline, then the
   consequence translated for the reader: "the more tokens it uses — in other
   words, the faster you'll use up your quota."
2. **Anti-hype, in both directions.** Don't oversell the tools ("fast and
   pretty good, but still needs your input") and don't oversell Averde.
   Front-load caveats — expectations come *before* the pitch. Admit limits by
   name; call out sleazy moves by name. Name a limit and then the remedy —
   never leave it as a bare fact or a joke. "It can't see your inbox\*… \*yet"
   became "Claude doesn't know what's in your inbox, customer records, or
   files unless you paste it, upload it, or give Claude access to it."
3. **Specific over general.** Real dollar figures, real timelines, real
   examples, exact click-paths ("Click your username in the bottom left →
   Settings → General"). Hedge fuzzy numbers honestly ("+" suffixes, "a couple
   weeks") and never claim what you can't prove (no speculative moats).
4. **Mechanism over psychology.** When explaining why people get things wrong,
   give the technical reason, not their vanity.
5. **Don't send readers to standing Instructions for one-off advice.** What
   goes in Instructions for Claude applies to *every* conversation. A role
   that suits one kind of task doesn't belong there, and telling people to
   put it there gives them a setting that misfires on everything else.
6. **Reassure, never dare.** Adoption is a comfort progression: "start small,"
   "as you get comfortable," "if you're feeling adventurous." Stage the
   reader's inner voice ("maybe you're thinking, 'I wish I could build…'").
   Working with AI is management, not combat: "making corrections," "reining
   it in," force-multiplier — you make the calls.
7. **Teach by disclosure.** Personal practice as guidance — what I use, what I
   skip, and why ("there's a feature I *don't* use…"). Describe the real UI,
   warts included ("I know, it's a terrible design").

### Sound human — the ban list
No AI tropes, ever:
- "It's not X, it's Y" contrast framing
- Staccato triads and fragment runs ("Simple. Direct. Done." / "The tools
  existed. The use cases were real.") — collapse into one flowing sentence
  with commas or em-dashes
- "honest" / "genuinely" as modifiers — honesty shows in behavior, never as a
  self-label ("my honest advice" → "my advice"; "A few honest gotchas" →
  "A few further thoughts")
- Buzzwords: leverage (verb), synergy, ecosystem, revolutionize, transform,
  best-in-class, world-class, thought leader, "slick"
- Hedge words (might / could / potentially) where a direct claim is true
- Over-promising, padded word count
- Writerly metaphors for how prose behaves: "ceremony", "scaffolding",
  "doing work", "does the heavy lifting", "earns its place", "lands", "reads
  as". Describe the thing plainly — a template full of ROLE/CONTEXT/TONE
  blocks is "five hundred words wrapped around one request", not "ceremony".
- Clever or teasing headings. Name what the section is about: "What no longer
  works", not "What stopped mattering".
- Predicting the reader's reaction. "And file AI under 'overhyped'", "which
  you probably can't articulate". Give the instruction and stop; let them find
  out.
- Unbacked claims about what the AI will do. "You'll usually get a straight
  answer" had nothing behind it and contradicted the same post's warning that
  a wrong answer sounds like a right one. Check any claim about model
  behavior against the caveats already in the piece.
- Verdicts standing in for the claim: "it's spent", "dead weight", "the single
  biggest", "never the ingredient that worked". Say what's actually true.
- Two-sentence setup and reveal — stating a thing so the next sentence can
  correct it. Write the correct version once.
- Naming a thing by where you saw it instead of what it is. "The 400-word
  template from LinkedIn" assumed the reader has seen those posts. Most
  haven't, so it reads as a reference to nothing. It became "the structured
  template" — describe the thing, then the reader knows what you mean.

### Structure
- Open with a concrete scenario, not a thesis statement. Cinematic openers
  ("Scene:") welcome.
- Direct claim first in each section, then the support. Numbered, ranked,
  opinionated lists ("Three things, in order of impact"). "Make sure…"
  imperatives for parallel list headings.
- Conversational connectors at section breaks ("So,", "Beyond the…",
  "Remember —"); don't open a section with a bare noun.
- Headings say what's in the section, in customer words. A reader scanning
  the headings alone should get the outline.
- Say what something *isn't* (defensive prose). Close on the strategic or
  urgency point. The brand-term payoff line ("Your site wasn't AI Ready.")
  belongs at the end of a sales page — not at the end of every blog section,
  where it produces neat closing beats that get cut.
- End a section on an instruction or a concrete consequence, not a line that
  sounds like a conclusion. "Both stay necessary no matter how good the models
  get" → "you're still responsible for the end result"; "you can pick it up
  this afternoon" → "it'll save you rounds of edits, or worse yet, abandoning
  the results to just write your own."
- Prices as a value progression with the entry tier reassured ("To start,
  the $20/mo plan should be plenty").

### Verbal fingerprints
Uses: "your front desk", "the math is clear", "stop letting X become Y",
"no fluff / no jargon / no pressure", "fit how you work", colloquial-plain
idioms ("sucked into the hype", "before it goes out the door", "make the
calls"), parenthetical self-include ("which we all should be doing anyway"),
"actually" only when it earns its place. Claude listed first among AI engines.

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
2. Diff them and list the changes — what changed, not why
3. **Ask Mark why, for anything whose reason isn't self-evident from the text
   itself.** A typo, a banned word, a wrong fact — those explain themselves.
   Everything else has a reason I can't see from a diff, and guessing it puts
   a made-up rule in this file that misdirects every future post. Ask, in one
   batch, before writing anything.
4. Fold the *confirmed* reasons into the unified "Mark's voice" section above,
   under whichever heading fits (principle, ban list, structure, fingerprints).
   Generalize when possible; don't append dated sections or one-off examples.
5. The next post I draft pulls from these patterns automatically since this
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

## Product rule — segment before you ask (readiness audit + funnel)

One-size-fits-all questions read as tone-deaf the moment they miss. A solo
massage therapist or bodyworker never writes "quotes & proposals" — asking
about them signals the audit wasn't built for them. Rule for the readiness
audit and everything downstream of it (report moves, email playbooks, first
prompts, the $27 Instructions file): an early answer — business type / how
they sell — must put people in a bucket, and every later question, canned
move, and example comes from that bucket's world. Roughly:

- **Appointment-based solo practitioners** (therapists, bodywork, salons,
  coaches) — intake forms, no-shows, rebooking, session notes, the same
  client questions. Never "quotes."
- **Project / quote businesses** (contractors, agencies, trades) — quoting,
  proposals, job follow-up, scheduling crews.
- **Retail / e-commerce** — product questions, returns, inventory, listings.
- **Professional services** (law, accounting) — intake, document drafting,
  client updates; watch scope-of-practice language.

When adding any audit question or canned recommendation, ask: does this
exist in every bucket, or does it need a per-bucket variant? If the latter,
branch it — don't average it.

## Other repo conventions (for future sessions)

- CMS-editability rule (per CLIENT_PLAYBOOK.md Phase 5): visible page copy
  should be editable in Keystatic — one singleton per page. Wired as of
  2026-07-22: home, about (partial), pricing, ai-audit, how-it-works,
  contact, blog/case-study index headers, settings (email + footer
  location), website-audit, ai-business-assessment, plus collections for
  industries, blog, and case studies.
  Deliberate hardcode exceptions (each documented here so they read as
  intentional): nav/footer link labels; SEO meta on non-singleton pages;
  the audit widget's copy (public/audit/index.html — it's an app, not page
  prose); the Google Calendar booking-embed URL on /ai-audit and /contact;
  contact-form field labels and status banners (app chrome); the /free/*
  tool pages and /privacy (interactive tools + legal text — revisit if Mark
  wants them editable); glossary terms in src/data/glossary.ts (shared by
  the page and the site-wide hover-tooltips; dev-edited).

- The two audit widgets live in `public/` as standalone HTML apps, each
  embedded on exactly one page: `public/audit/index.html` on
  `/website-audit`, `public/readiness/index.html` on
  `/ai-business-assessment`. `/ai-audit` and `/ai-consulting` link to those
  pages rather than embedding a second copy. Loading either widget with
  `?view=all` renders the reference view — every step, option, and check
  stacked on one scrolling page — which is what the internal
  `/website-audit-mark` and `/ai-business-assessment-mark` pages show. The
  reference view drives the real step renderers and the real `buildChecks()`,
  so adding a question or a check shows up there with no extra work; it also
  sets `sendStatus: 'sent'` and pre-fills `state.recs` so it never sends a
  lead email or calls `/api/recommend`. Both `-mark` pages are noindex
  (`noIndex` prop on BaseLayout) and disallowed in robots.txt.

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
- All blog posts should be ~1,200-1,800 words and AEO/GEO-shaped (direct
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
