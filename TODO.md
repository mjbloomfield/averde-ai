# Averde AI — TODO

Active task list for the averde.ai marketing site. Workflow rules in `CLAUDE.md`. Top of `## To do` = next thing to work on. Completed work and substantive ad-hoc work both get logged in `## Project log` with a one-line summary.

Site: `https://averde.ai` · Stack: Astro + Tailwind + Keystatic + Supabase + Resend on Vercel · Repo: `mjbloomfield/averde-ai`.

---

## To do

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
