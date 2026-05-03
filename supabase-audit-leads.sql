-- Run this in the averde-app Supabase project's SQL editor.
-- One-time setup for logging every AI Readiness Audit submission from averde.ai.

create table if not exists public.audit_leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- Lead identity
  name            text,
  email           text not null,
  website         text,
  industry        text,
  city            text,

  -- Free-text answers
  keywords        text,
  goal            text,

  -- Structured answers
  tools           jsonb,
  pains           jsonb,

  -- Computed report
  scores          jsonb,
  opportunities   jsonb,

  -- Email delivery telemetry
  email_status    text not null default 'pending', -- 'sent' | 'failed' | 'config' | 'pending'
  email_error     text,

  -- Request telemetry
  user_agent      text,
  referer         text
);

create index if not exists audit_leads_created_at_idx on public.audit_leads (created_at desc);
create index if not exists audit_leads_email_idx      on public.audit_leads (email);
create index if not exists audit_leads_industry_idx   on public.audit_leads (industry);

-- Lock down direct client access. The averde.ai API endpoint writes
-- via the service role, which bypasses RLS.
alter table public.audit_leads enable row level security;
