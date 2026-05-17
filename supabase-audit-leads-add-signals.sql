-- Run this in the averde-app Supabase SQL editor.
-- Adds the two new real-signal columns to audit_leads.

alter table public.audit_leads
  add column if not exists site_audit    jsonb,
  add column if not exists ai_visibility jsonb;
