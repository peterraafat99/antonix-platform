-- Phase 3: AI Review Drafts and Company AI Settings

create type public.review_draft_status as enum ('draft', 'approved', 'published', 'rejected', 'failed');

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  require_approval boolean not null default true,
  auto_publish_eligible_replies boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_drafts (
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

create index company_settings_company_id_idx on public.company_settings(company_id);
create index review_drafts_company_id_idx on public.review_drafts(company_id);
create index review_drafts_google_location_id_idx on public.review_drafts(google_location_id);
create index review_drafts_status_idx on public.review_drafts(company_id, status);

create trigger company_settings_updated_at before update on public.company_settings
for each row execute function public.set_updated_at();

create trigger review_drafts_updated_at before update on public.review_drafts
for each row execute function public.set_updated_at();

alter table public.company_settings enable row level security;
alter table public.review_drafts enable row level security;

-- RLS policies for company_settings
create policy company_settings_select_company on public.company_settings for select to authenticated
using ((select private.has_company_access(company_id)));

create policy company_settings_insert_owner on public.company_settings for insert to authenticated
with check ((select private.is_company_owner(company_id)));

create policy company_settings_update_owner on public.company_settings for update to authenticated
using ((select private.is_company_owner(company_id)))
with check ((select private.is_company_owner(company_id)));

create policy company_settings_delete_owner on public.company_settings for delete to authenticated
using ((select private.is_company_owner(company_id)));

-- RLS policies for review_drafts
create policy review_drafts_select_company on public.review_drafts for select to authenticated
using ((select private.has_company_access(company_id)));

create policy review_drafts_insert_owner on public.review_drafts for insert to authenticated
with check ((select private.is_company_owner(company_id)));

create policy review_drafts_update_owner on public.review_drafts for update to authenticated
using ((select private.is_company_owner(company_id)))
with check ((select private.is_company_owner(company_id)));

create policy review_drafts_delete_owner on public.review_drafts for delete to authenticated
using ((select private.is_company_owner(company_id)));

-- Table grants
grant select, insert, update, delete on public.company_settings to authenticated;
grant select, insert, update, delete on public.company_settings to service_role;

grant select, insert, update, delete on public.review_drafts to authenticated;
grant select, insert, update, delete on public.review_drafts to service_role;
