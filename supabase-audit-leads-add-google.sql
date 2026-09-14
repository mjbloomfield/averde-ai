-- Run this in the averde-app Supabase SQL editor.
-- Stores the live Google SERP check (/api/google-visibility) alongside the
-- Perplexity one, so a lead's organic positions, paid placements and AI
-- Overview citations are kept with the rest of their audit.
-- Applied 2026-09-13.

alter table public.audit_leads
  add column if not exists google_visibility jsonb;
