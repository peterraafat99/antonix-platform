-- ==============================================================================
-- SAFE MASTER PRODUCTION SETUP SCRIPT FOR SUPABASE
-- Run this once in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create Enums if they don't exist
do $$ begin
  create type public.review_draft_status as enum ('draft', 'approved', 'published', 'rejected', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.scheduled_reply_status as enum (
    'pending',
    'scheduled',
    'approved',
    'publishing',
    'published',
    'cancelled',
    'failed',
    'quota_exceeded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.quota_request_status as enum (
    'pending',
    'approved',
    'denied'
  );
exception when duplicate_object then null;
end $$;

-- 2. Create Company Settings & Tables
create table if not exists public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  require_approval boolean not null default true,
  auto_publish_eligible_replies boolean not null default false,
  daily_ai_reply_publish_cap integer not null default 20 check (daily_ai_reply_publish_cap >= 0),
  timezone text not null default 'UTC',
  ai_enabled boolean not null default true,
  publishing_enabled boolean not null default true,
  tone text not null default 'friendly',
  reply_length text not null default 'medium',
  language text not null default 'auto',
  emoji_preference text not null default 'minimal',
  customer_name_preference text not null default 'first_name',
  company_description text not null default '',
  custom_instructions text not null default '',
  negative_review_policy text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- In case company_settings existed without the new columns:
alter table public.company_settings
  add column if not exists daily_ai_reply_publish_cap integer not null default 20 check (daily_ai_reply_publish_cap >= 0),
  add column if not exists timezone text not null default 'UTC',
  add column if not exists ai_enabled boolean not null default true,
  add column if not exists publishing_enabled boolean not null default true;

create table if not exists public.review_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  google_location_id uuid references public.google_locations(id) on delete cascade,
  google_review_name text not null,
  original_review_text text not null default '',
  star_rating integer not null default 5 check (star_rating between 0 and 5),
  reviewer_name text,
  generated_draft_text text not null default '',
  status public.review_draft_status not null default 'draft',
  confidence_score numeric(3,2) not null default 1.00 check (confidence_score between 0.00 and 1.00),
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  published_at timestamptz,
  unique (company_id, google_review_name)
);

create table if not exists public.scheduled_review_replies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  google_location_id uuid references public.google_locations(id) on delete cascade,
  google_review_name text not null,
  draft_id uuid references public.review_drafts(id) on delete cascade,
  scheduled_for timestamptz not null,
  status public.scheduled_reply_status not null default 'scheduled',
  attempt_count integer not null default 0,
  idempotency_key text not null unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.quota_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by_user_id uuid references public.profiles(id) on delete set null,
  current_cap integer not null default 20,
  requested_cap integer not null check (requested_cap > current_cap),
  reason text,
  status public.quota_request_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null default 'draft_generation',
  provider text not null default 'gemini',
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.company_faqs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_examples (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  star_rating integer not null default 5,
  review_text text not null,
  reply_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  company_id uuid primary key references public.companies(id) on delete cascade,
  email_on_negative boolean not null default true,
  email_on_sensitive boolean not null default true,
  notification_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Indexes
create index if not exists company_settings_company_id_idx on public.company_settings(company_id);
create index if not exists review_drafts_company_id_idx on public.review_drafts(company_id);
create index if not exists review_drafts_google_location_id_idx on public.review_drafts(google_location_id);
create index if not exists review_drafts_status_idx on public.review_drafts(company_id, status);
create index if not exists scheduled_replies_company_id_idx on public.scheduled_review_replies(company_id);
create index if not exists scheduled_replies_status_idx on public.scheduled_review_replies(status);
create index if not exists scheduled_replies_scheduled_for_idx on public.scheduled_review_replies(scheduled_for) where status = 'scheduled';
create index if not exists quota_requests_company_id_idx on public.quota_requests(company_id);
create index if not exists quota_requests_status_idx on public.quota_requests(status);
create index if not exists usage_events_company_id_idx on public.usage_events(company_id);
create index if not exists audit_logs_company_id_idx on public.audit_logs(company_id);
create index if not exists company_faqs_company_id_idx on public.company_faqs(company_id);
create index if not exists ai_examples_company_id_idx on public.ai_examples(company_id);

-- 4. Enable RLS
alter table public.company_settings enable row level security;
alter table public.review_drafts enable row level security;
alter table public.scheduled_review_replies enable row level security;
alter table public.quota_requests enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.company_faqs enable row level security;
alter table public.ai_examples enable row level security;
alter table public.notification_preferences enable row level security;

-- 5. RLS Policies (Tenant Isolation)
do $$ begin
  create policy company_settings_select on public.company_settings for select to authenticated using ((select private.has_company_access(company_id)));
  create policy company_settings_all on public.company_settings for all to authenticated using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy review_drafts_select on public.review_drafts for select to authenticated using ((select private.has_company_access(company_id)));
  create policy review_drafts_all on public.review_drafts for all to authenticated using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy scheduled_replies_select on public.scheduled_review_replies for select to authenticated using ((select private.has_company_access(company_id)));
  create policy scheduled_replies_owner_all on public.scheduled_review_replies for all to authenticated using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy quota_requests_select on public.quota_requests for select to authenticated using ((select private.has_company_access(company_id)));
  create policy quota_requests_insert on public.quota_requests for insert to authenticated with check ((select private.has_company_access(company_id)));
  create policy quota_requests_admin_all on public.quota_requests for all to authenticated using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy usage_events_select on public.usage_events for select to authenticated using ((select private.has_company_access(company_id)));
  create policy usage_events_insert on public.usage_events for insert to authenticated with check ((select private.has_company_access(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy audit_logs_select on public.audit_logs for select to authenticated using ((select private.has_company_access(company_id)));
  create policy audit_logs_insert on public.audit_logs for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy company_faqs_select on public.company_faqs for select to authenticated using ((select private.has_company_access(company_id)));
  create policy company_faqs_all on public.company_faqs for all to authenticated using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy ai_examples_select on public.ai_examples for select to authenticated using ((select private.has_company_access(company_id)));
  create policy ai_examples_all on public.ai_examples for all to authenticated using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy notification_pref_select on public.notification_preferences for select to authenticated using ((select private.has_company_access(company_id)));
  create policy notification_pref_all on public.notification_preferences for all to authenticated using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

-- 6. Grant Permissions
grant usage on schema public to authenticated, anon, service_role;
grant usage on schema private to authenticated, anon, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant all on all routines in schema public to authenticated, service_role;

-- 7. Ensure Demo Company exists (without hardcoded IDs)
insert into public.companies (name, slug, is_enabled)
values ('Demo Client Business', 'demo-client-business', true)
on conflict (slug) do update set is_enabled = true;

-- 8. Link Users to the Real Company ID dynamically
insert into public.profiles (id, full_name, global_role)
select id, coalesce(raw_user_meta_data->>'full_name', email), 'platform_admin'
from auth.users
on conflict (id) do update set global_role = 'platform_admin';

insert into public.company_members (company_id, user_id, member_role, status)
select c.id, u.id, 'business_owner', 'active'
from auth.users u
cross join (select id from public.companies where slug = 'demo-client-business' limit 1) c
on conflict (company_id, user_id) do update set status = 'active', member_role = 'business_owner';
