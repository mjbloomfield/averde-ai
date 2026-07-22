# Averde AI — TODO

Active task list for the averde.ai marketing site. Workflow rules in `CLAUDE.md`. Top of `## To do` = next thing to work on. Completed work and substantive ad-hoc work both get logged in `## Project log` with a one-line summary.

Site: `https://averde.ai` · Stack: Astro + Tailwind + Keystatic + Supabase + Resend on Vercel · Repo: `mjbloomfield/averde-ai`.

---

## To do

- **Decide the audit's name** — Mark is leaning toward "AI Website Audit" / "AI Website Readiness Audit" (currently "AI Visibility Audit" site-wide). Scoping it to *website* also clears the name space for the business audit below. Rename is copy-only; keep the /ai-audit URL.
- **Develop an "AI Business Audit"** — separate product idea: how are you using AI in your business (operations, workflows, tooling), not just how AI sees your website. Would pair with the existing website audit as a two-audit funnel.
- **Part 3 review pass** — Mark edits `/blog-drafts/02c-connect-claude-to-your-apps-mark-edited.md` (post is drafted, dated 2099/unpublished). On publish: set real date, update Parts 1-2 to say "3-part series" and cross-link Part 3.
- **Playbook-review punch list (2026-07-22 audit vs CLIENT_PLAYBOOK.md):**
  - Replace fabricated-looking testimonials — home.yaml "Tasha Reyes" + Keystatic default "Dr. Priya Ramanathan" (FTC/credibility risk; overlaps existing testimonial item below).
  - Wire or delete the dead `settings` singleton (email/phone/bookingUrl/location — no content file; now partially read by /ai-audit with fallback). Decide if a phone/tel: CTA should exist at all.
  - Add a real 1200×630 OG image (og:image is currently a portrait headshot).
  - Add `caseStudies` collection to keystatic.config.ts (content renders but isn't CMS-editable).
  - CMS-wire or declare as exceptions: how-it-works, contact, /free/*, privacy, blog/case-study index headers. (ai-audit wired 2026-07-22; exceptions section added to CLAUDE.md.)
  - Emit BreadcrumbList schema on nested routes; add apple-touch-icon (180×180).
  - Honor prefers-reduced-motion in the BaseLayout reveal script.
  - Pass faqItems from pricing/industries pages so their Q&A copy gets FAQPage schema.
  - Confirm /dental, /hvac, /real-estate stubs actually redirect (no 301 config exists).
- **Privacy policy legal skim** — `/privacy` is drafted in plain English; have a lawyer glance at it if you want belt-and-suspenders (not legal advice).
- **Glossary page (`/glossary`, DefinedTermSet schema)** — AEO asset: A–Z terms (AEO, schema markup, LLM, AI Overviews, citation network, etc.) with hash-anchored deep links. Drafted as part of the playbook pass — review the copy.
- **Comparison post — "AEO vs SEO"** — decision-stage, on-brand. Drafted in `/blog-drafts` for your edit pass.
- **Verify the fabricated-vs-real testimonial on the homepage** — home.yaml quotes "Tasha Reyes · Front Range Family Dental"; if not a real client, replace with the real Sharon T. quote from the Tissue Alchemy work. Integrity risk for an anti-hype brand.
- **Cross-link the Claude 2-part series from `/free/claude-starter-kit`** — the posts are live now; the starter-kit page should point at them.
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
- 2026-07-01 — **AI Audit revamp**: rebuilt `/audit` widget from React/Babel/Tailwind-CDN to self-contained vanilla JS; replaced heuristic scoring with a transparent 13-check evidence-based checklist (renamed "AI Visibility Audit" site-wide); site-audit API gained llms.txt/HTTPS/H1 checks; audit-lead API now emails the user their full report (was Mark-only); iframe auto-resizes. Verified end-to-end headless (Playwright) incl. live Perplexity + site fetch.
- 2026-07-06 — Audit platform detection upgraded: site-audit API now fingerprints hosting via response headers + DNS (A/CNAME/NS via node:dns) — detects Vercel/Netlify/GitHub Pages/Kinsta/WP Engine/Cloudflare etc. alongside the builder (added Framer, HubSpot, Webflow DNS/asset fingerprints). Widget shows "Platform · Hosted on" and tailors schema fixes per platform (incl. custom-built fallback). Verified live against averde.ai (Vercel), wordpress.org, squarespace.com, tissuealchemy.com (WordPress).
- 2026-07-01 — Added free-resources hub (`/free`) with two new resources: AI-Ready Website Checklist (21 items, localStorage progress, FAQ schema) and Claude Starter Kit (Instructions template + 10 prompts + first-week plan, copy buttons); new `/api/subscribe` + SubscribeForm on blog/resource pages (Supabase `subscribers` table + Resend fallback); homepage tools grid, footer, llms.txt, sitemap updated. Deleted live "Test blog post"; fixed Part-1 Claude post broken slug links + typos; sitemap no longer lists unpublished future-dated posts.
- 2026-07-15 — Committed + pushed the audit revamp, /free hub, and blog fixes (755fab3, 8ed8d25, 04723f2); production deploy verified live. Mark ran `supabase-subscribers.sql`; subscribe flow verified end-to-end against the live site (row inserted + test row removed). Dropped the stale astro-6-upgrade verification item — the upgrade merged to main as PR #1. Deleted stale branches (wire-about-cms, mark_draft — both superseded by main).
- 2026-07-15 — Tissue Alchemy case study made non-tech friendly: plain-English notes under every by-the-numbers metric, hero dek in Mark's words, problem section reframed around "nobody searches for Tissue Alchemy", rebuild link now points at the live www.tissuealchemy.com (10a54ff).
- 2026-07-17 — GA4 enabled: new "Averde AI" GA property (541730636), `PUBLIC_GA_ID=G-M65TM230VH` set in Vercel production + local `.env`, production redeployed, tag verified in live homepage HTML.
- 2026-07-17 — Published the Claude 2-part blog series: Mark renamed/rewrote Part 1 as `claude-cowork` (Keystatic); Part 2 rewritten in the new voice and renamed `how-to-set-up-claude` (real Home/Code UI layout, $20/mo, memory-off note, Code demoted to "stick with Cowork"); new voice patterns appended to CLAUDE.md; both posts dated live.
- 2026-07-20 — Replaced the dead TidyCal embeds on /ai-audit and /contact with Mark's Google Calendar appointment schedule iframe (TidyCal had converted the page to a blank MeetingBriefs-branded marketing page). Note: the Google schedule is titled "MB phone call, 15 min" while page copy says 30-minute review call — rename or re-link when a 30-min schedule exists.
- 2026-07-20 — Audit Perplexity check now uses the user's own customer search phrases (up to 10, city auto-appended) instead of the generic industry+city query; report shows per-phrase results with partial-credit scoring. Background-checks status strip added to steps 3–4 so the instant score reads as live work, not a fake. Goal dropdown labeled as follow-up-only. User report email widened to 720px and now links to a stored web copy (new `audit_reports` Supabase table + SSR route `/audit/report/[id]`, noindex).
- 2026-07-17 — Fixed audit false negatives: site-audit API now scans up to 4 schema-bearing subpages (faq/services/rates/pricing/about/contact/how-it-works) found via homepage links, not just the homepage; widget evidence shows where each schema type was found ("on /faq/") and how many pages were checked. Found via Mark's own audit of tissuealchemy.com flagging FAQ/Service schema as missing when they lived on subpages (correct placement). Verified end-to-end headless against tissuealchemy.com and averde.ai.
- 2026-07-21 — Glossary system: terms moved to src/data/glossary.ts, added tokens/quota/AI model/connector, site-wide hover-tooltips on any /glossary# link (BaseLayout), first-mention links added across blog posts + audit page (4d7faae). Part 1: working memory → working knowledge, tabs → modes. Drafted Part 3 "Connect Claude to your apps" — unpublished, facts verified against support.claude.com (843b3c4).
