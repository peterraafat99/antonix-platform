-- ==============================================================================
-- MIGRATION: Security Pilot Quotas, Delayed Scheduling, and Circuit Breakers
-- ==============================================================================

-- 1. Create Enums for Scheduled Replies and Quota Requests
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

-- 2. Extend Company Settings with Quotas, Timezone, and Circuit Breakers
alter table public.company_settings
  add column if not exists daily_ai_reply_publish_cap integer not null default 20 check (daily_ai_reply_publish_cap >= 0),
  add column if not exists timezone text not null default 'UTC',
  add column if not exists ai_enabled boolean not null default true,
  add column if not exists publishing_enabled boolean not null default true;

-- 3. Scheduled Review Replies Table (Durable Queue for 30-60 min Delayed Publishing)
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

-- 4. Quota Requests Table (Client Capacity Requests)
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

-- 5. Indexes
create index if not exists scheduled_replies_company_id_idx on public.scheduled_review_replies(company_id);
create index if not exists scheduled_replies_status_idx on public.scheduled_review_replies(status);
create index if not exists scheduled_replies_scheduled_for_idx on public.scheduled_review_replies(scheduled_for) where status = 'scheduled';
create index if not exists quota_requests_company_id_idx on public.quota_requests(company_id);
create index if not exists quota_requests_status_idx on public.quota_requests(status);

-- 6. Trigger for updated_at
create trigger scheduled_replies_updated_at before update on public.scheduled_review_replies
for each row execute function public.set_updated_at();

-- 7. Enable RLS
alter table public.scheduled_review_replies enable row level security;
alter table public.quota_requests enable row level security;

-- 8. Strict RLS Tenant Policies for scheduled_review_replies
do $$ begin
  create policy scheduled_replies_select on public.scheduled_review_replies
    for select to authenticated
    using ((select private.has_company_access(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy scheduled_replies_owner_all on public.scheduled_review_replies
    for all to authenticated
    using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

-- 9. Strict RLS Tenant Policies for quota_requests
do $$ begin
  create policy quota_requests_select on public.quota_requests
    for select to authenticated
    using ((select private.has_company_access(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy quota_requests_insert on public.quota_requests
    for insert to authenticated
    with check ((select private.has_company_access(company_id)));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy quota_requests_admin_all on public.quota_requests
    for all to authenticated
    using ((select private.is_company_owner(company_id)));
exception when duplicate_object then null;
end $$;

-- 10. Table Grants
grant select, insert, update, delete on public.scheduled_review_replies to authenticated, service_role;
grant select, insert, update, delete on public.quota_requests to authenticated, service_role;

-- 11. Stored Procedures: Atomic Quota Reservation & Validation
create or replace function private.reserve_daily_publish_quota(
  p_company_id uuid,
  p_timezone text default 'UTC'
)
returns table (
  allowed boolean,
  used_today integer,
  daily_cap integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_cap integer;
  v_used integer;
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_tz text;
begin
  -- Resolve company settings and cap
  select coalesce(cs.daily_ai_reply_publish_cap, 20), coalesce(cs.timezone, p_timezone)
  into v_cap, v_tz
  from public.company_settings cs
  where cs.company_id = p_company_id;

  if v_cap is null then
    v_cap := 20;
    v_tz := 'UTC';
  end if;

  -- Compute start and end of calendar day in company's timezone
  v_today_start := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  v_today_end := v_today_start + interval '1 day';

  -- Count successfully published AI review replies today (mock excluded)
  select count(*)::integer
  into v_used
  from public.review_drafts rd
  where rd.company_id = p_company_id
    and rd.status = 'published'
    and rd.published_at >= v_today_start
    and rd.published_at < v_today_end;

  if v_used < v_cap then
    return query select true, v_used, v_cap, (v_cap - v_used);
  else
    return query select false, v_used, v_cap, 0;
  end if;
end;
$$;

grant execute on function private.reserve_daily_publish_quota(uuid, text) to authenticated, service_role;
