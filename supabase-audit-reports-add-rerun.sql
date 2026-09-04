-- Run this in the averde-app Supabase SQL editor.
-- Lets a report page re-check the site it describes.
--
-- audit_reports previously stored only the rendered HTML, so there was no way
-- to know which site a report was about. These columns carry the website and
-- the raw signals from the original run, which is what the re-run compares
-- against. Nothing here changes existing rows; reports written before this
-- migration have a null website and the re-run button tells the visitor so.

alter table public.audit_reports
  add column if not exists website        text,
  add column if not exists site_audit     jsonb,
  add column if not exists last_rerun_at  timestamptz,
  add column if not exists rerun_count    integer not null default 0;

create index if not exists audit_reports_website_idx on public.audit_reports (website);
