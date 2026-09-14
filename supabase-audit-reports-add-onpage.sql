-- Run this in the averde-app Supabase SQL editor.
-- Holds the deep OnPage crawl (broken links, duplicate content) that is posted
-- to DataForSEO when a lead is captured. The crawl takes minutes, so the task
-- id is stored first and the results are collected when the report page is
-- opened (/api/onpage-results), then cached in `onpage`.
-- Applied 2026-09-13.

alter table public.audit_reports
  add column if not exists onpage_task_id text,
  add column if not exists onpage         jsonb;
