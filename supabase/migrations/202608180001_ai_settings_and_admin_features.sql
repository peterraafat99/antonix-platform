-- Phase 4: Extended AI Settings, FAQs, AI Examples, Notifications, Usage Events, and Audit Logs

-- 1. Extend company_settings with prompt customization controls
alter table public.company_settings
  add column if not exists tone text not null default 'friendly',
  add column if not exists reply_length text not null default 'medium',
  add column if not exists language text not null default 'auto',
  add column if not exists emoji_preference text not null default 'minimal',
  add column if not exists customer_name_preference text not null default 'first_name',
  add column if not exists company_description text not null default '',
  add column if not exists custom_instructions text not null default '',
  add column if not exists negative_review_policy text not null default '';

-- 2. FAQs table for company context
create table if not exists public.company_faqs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 1000),
  answer text not null check (char_length(answer) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_faqs_company_id_idx on public.company_faqs(company_id);
create trigger company_faqs_updated_at before update on public.company_faqs
  for each row execute function public.set_updated_at();

-- 3. AI Examples table for company reply style guidelines
create table if not exists public.ai_examples (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  star_rating integer not null default 5 check (star_rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 1 and 2000),
  reply_text text not null check (char_length(reply_text) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_examples_company_id_idx on public.ai_examples(company_id);
create trigger ai_examples_updated_at before update on public.ai_examples
  for each row execute function public.set_updated_at();

-- 4. Notification Preferences
create table if not exists public.notification_preferences (
  company_id uuid primary key references public.companies(id) on delete cascade,
  email_on_negative boolean not null default true,
  email_on_sensitive boolean not null default true,
  notification_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_preferences_company_id_idx on public.notification_preferences(company_id);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- 5. Usage Events (for generation count tracking against 2,500/month pilot capacity)
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  provider text not null default 'mock',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_company_id_idx on public.usage_events(company_id);
create index if not exists usage_events_created_at_idx on public.usage_events(created_at);

-- 6. Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_company_id_idx on public.audit_logs(company_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);

-- RLS Configuration
alter table public.company_faqs enable row level security;
alter table public.ai_examples enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_logs enable row level security;

-- Policies for company_faqs
create policy company_faqs_select_company on public.company_faqs for select to authenticated
  using ((select private.has_company_access(company_id)));
create policy company_faqs_insert_owner on public.company_faqs for insert to authenticated
  with check ((select private.is_company_owner(company_id)));
create policy company_faqs_update_owner on public.company_faqs for update to authenticated
  using ((select private.is_company_owner(company_id))) with check ((select private.is_company_owner(company_id)));
create policy company_faqs_delete_owner on public.company_faqs for delete to authenticated
  using ((select private.is_company_owner(company_id)));

-- Policies for ai_examples
create policy ai_examples_select_company on public.ai_examples for select to authenticated
  using ((select private.has_company_access(company_id)));
create policy ai_examples_insert_owner on public.ai_examples for insert to authenticated
  with check ((select private.is_company_owner(company_id)));
create policy ai_examples_update_owner on public.ai_examples for update to authenticated
  using ((select private.is_company_owner(company_id))) with check ((select private.is_company_owner(company_id)));
create policy ai_examples_delete_owner on public.ai_examples for delete to authenticated
  using ((select private.is_company_owner(company_id)));

-- Policies for notification_preferences
create policy notification_preferences_select_company on public.notification_preferences for select to authenticated
  using ((select private.has_company_access(company_id)));
create policy notification_preferences_insert_owner on public.notification_preferences for insert to authenticated
  with check ((select private.is_company_owner(company_id)));
create policy notification_preferences_update_owner on public.notification_preferences for update to authenticated
  using ((select private.is_company_owner(company_id))) with check ((select private.is_company_owner(company_id)));
create policy notification_preferences_delete_owner on public.notification_preferences for delete to authenticated
  using ((select private.is_company_owner(company_id)));

-- Policies for usage_events
create policy usage_events_select_company on public.usage_events for select to authenticated
  using ((select private.has_company_access(company_id)));
create policy usage_events_insert_company on public.usage_events for insert to authenticated
  with check ((select private.has_company_access(company_id)));

-- Policies for audit_logs
create policy audit_logs_select_admin_or_owner on public.audit_logs for select to authenticated
  using ((select private.is_platform_admin()) or (company_id is not null and private.is_company_owner(company_id)));

-- Grants
grant select, insert, update, delete on public.company_faqs to authenticated, service_role;
grant select, insert, update, delete on public.ai_examples to authenticated, service_role;
grant select, insert, update, delete on public.notification_preferences to authenticated, service_role;
grant select, insert, update, delete on public.usage_events to authenticated, service_role;
grant select, insert, update, delete on public.audit_logs to authenticated, service_role;
