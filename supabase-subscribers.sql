-- Run this in the same Supabase project as audit_leads.
-- Logs email subscribers from the blog index and free-resource pages.

create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null unique,
  source      text  -- which page/form they came from, e.g. 'blog', 'ai-ready-checklist'
);

create index if not exists subscribers_created_at_idx on public.subscribers (created_at desc);

-- Same access model as audit_leads: service-role writes only.
alter table public.subscribers enable row level security;
