# Averde AI — TODO

Active task list for the averde.ai marketing site. Workflow rules in `CLAUDE.md`. Top of `## To do` = next thing to work on. Completed work and substantive ad-hoc work both get logged in `## Project log` with a one-line summary.

Site: `https://averde.ai` · Stack: Astro + Tailwind + Keystatic + Supabase + Resend on Vercel · Repo: `mjbloomfield/averde-ai`.

---

## To do

- **Verify the `astro-6-upgrade` Vercel preview before merging to main.** Especially: (1) `/keystatic` login + an edit/publish round-trip (storage is cloud; the old manual OAuth route was removed and the integration now injects routes); (2) eyeball home, blog post, how-it-works, pricing, glossary for any Tailwind 4 visual shift; (3) confirm preview URL shows `noindex` and production won't. Merge only after it looks right.
- **Set `PUBLIC_GA_ID` in Vercel (production) + local `.env`** to turn on analytics. Uses existing GA4 property. If you'd rather avoid cookies/consent, say so and I'll swap SEOHead's snippet for Plausible or Cloudflare Web Analytics (cookieless).
- **Privacy policy legal skim** — `/privacy` is drafted in plain English; have a lawyer glance at it if you want belt-and-suspenders (not legal advice).
- **Glossary page (`/glossary`, DefinedTermSet schema)** — AEO asset: A–Z terms (AEO, schema markup, LLM, AI Overviews, citation network, etc.) with hash-anchored deep links. Drafted as part of the playbook pass — review the copy.
- **Comparison post — "AEO vs SEO"** — decision-stage, on-brand. Drafted in `/blog-drafts` for your edit pass.
- **Free lead magnet — "Set Up Claude Desktop" 1-pager + webpage** at `/free/setup-claude-desktop`. Email-gated PDF download; webpage shows full content + deep-dive sections (Custom Instructions, Connectors, Pro Workflows).
- **Free lead magnet — "Claude Cowork in 5 Minutes" 1-pager + webpage** at `/free/claude-cowork`. Same email-gated pattern; webpage with prompt library + side-by-side examples.
- **Email-gated download flow** — new Supabase table (`tool_downloads`: email, tool_slug, source, timestamp); inline form on each lead-magnet page; on submit → write row + serve PDF link.
- **Decide on $27 "Claude Desktop Toolkit"** — paid product alongside the free 1-pager. Differentiation by assets (industry-specific custom-instructions templates, Cowork prompt library, ~10-min screen-record). Wait until free lead magnets validate demand.
- **Continue training the voice corpus in `CLAUDE.md`** — next time Mark edits a draft, diff and append observed patterns to the "Mark's voice" section. The voice section should grow.
- **(Maybe) Vercel daily cron pinging `/api/rebuild`** for scheduled-blog-post precision. Not needed yet per current weekly-commit cadence.
- **Schema for `tool_downloads` and audit segmentation** — once leads accumulate, build a Keystatic/admin view for who downloaded what and segment outreach.

---

## Project log

- 2026-04 (approx) — Site perf + AI readiness pass: image compression, schema.org @graph in SEOHead, dynamic sitemap, robots config (fc6eb9e).
- 2026-05 — Published first AI-Ready blog post: "What does it actually mean for a website to be AI-Ready?" (fa94072).
- 2026-05 — Added blog scheduling pattern (publishedDate filter), seeded CLAUDE.md voice-training corpus, set up `/blog-drafts/` workflow (72e85c4).
- 2026-05-19 — Homepage design pass: motion layer (IntersectionObserver reveals, staggered page-load), editorial typography (Fraunces + IBM Plex Mono labels), asymmetric grids, mesh-gradient CTA, hover treatments (dfd07c4).
- 2026-05-19 — Removed custom cursor dot from homepage (b3559c0).
- 2026-06-13 — Moved repo from ~/Programming into Google Drive (Claude_Cowork/websites/averde-ai); reinstalled deps fresh, history + remote intact.
- 2026-06-13 — Playbook pass (technical/SEO/legal): added `/llms.txt`, privacy policy at `/privacy` (+ footer/sitemap links), preview-only noindex gate (VERCEL_ENV), FAQPage schema on /how-it-works, GA4 analytics slot gated on PUBLIC_GA_ID (prod-only), Boulder/Colorado areaServed in LocalBusiness schema.
- 2026-06-13 — Added glossary page (/glossary, DefinedTermSet) + AEO-vs-SEO comparison draft; `npm audit fix` (12→7 vulns, semver-only).
- 2026-06-14 — **Astro 4→6 + Node 20→24 upgrade** on branch `astro-6-upgrade` (pending preview verification + merge). output hybrid→static; @astrojs/vercel 7→10; @astrojs/react 3→5; @astrojs/markdoc 0.11→1; dropped unused @astrojs/sitemap; Tailwind 3→4 via @tailwindcss/postcss (theme kept via `@config`, +border/cursor compat shims); content collections → Content Layer (glob loaders, .slug→.id, render()); removed manual Keystatic routes (integration injects them). `npm audit fix --force` rejected — it downgraded Astro to v2; remaining 8 highs are build-time-only (esbuild/path-to-regexp), don't ship to visitors.
