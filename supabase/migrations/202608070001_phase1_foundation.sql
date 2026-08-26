-- Phase 1: identity, companies, membership, and tenant isolation.
create extension if not exists pgcrypto;
create schema if not exists private;

create type public.global_role as enum ('user', 'platform_admin');
create type public.member_role as enum ('business_owner', 'business_member');
create type public.membership_status as enum ('active', 'invited', 'disabled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  global_role public.global_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role public.member_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index company_members_user_id_idx on public.company_members(user_id);
create index company_members_company_id_idx on public.company_members(company_id);
create index companies_enabled_idx on public.companies(is_enabled) where is_enabled;

create function private.is_platform_admin(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = check_user_id and p.global_role = 'platform_admin') $$;

create function private.has_company_access(check_company_id uuid, check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_platform_admin(check_user_id) or exists (
    select 1 from public.company_members m
    where m.company_id = check_company_id and m.user_id = check_user_id and m.status = 'active'
  )
$$;

revoke all on function private.is_platform_admin(uuid) from public;
revoke all on function private.has_company_access(uuid, uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_platform_admin(uuid) to authenticated;
grant execute on function private.has_company_access(uuid, uuid) to authenticated;

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger company_members_updated_at before update on public.company_members for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;

create policy profiles_select_self_or_admin on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_platform_admin()));
create policy profiles_admin_update on public.profiles for update to authenticated
using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));

create policy companies_select_member_or_admin on public.companies for select to authenticated
using ((select private.has_company_access(id)));
create policy companies_admin_insert on public.companies for insert to authenticated
with check ((select private.is_platform_admin()));
create policy companies_admin_update on public.companies for update to authenticated
using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy companies_admin_delete on public.companies for delete to authenticated
using ((select private.is_platform_admin()));

create policy memberships_select_self_company_or_admin on public.company_members for select to authenticated
using ((select auth.uid()) = user_id or (select private.has_company_access(company_id)));
create policy memberships_admin_insert on public.company_members for insert to authenticated
with check ((select private.is_platform_admin()));
create policy memberships_admin_update on public.company_members for update to authenticated
using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy memberships_admin_delete on public.company_members for delete to authenticated
using ((select private.is_platform_admin()));
