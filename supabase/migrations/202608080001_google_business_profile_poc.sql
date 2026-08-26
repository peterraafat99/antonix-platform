-- Phase 2: Google Business Profile connection metadata, protected tokens, and locations.
create type public.google_connection_status as enum ('active', 'revoked', 'error');

create table public.google_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  connected_by_user_id uuid not null references public.profiles(id) on delete restrict,
  status public.google_connection_status not null default 'active',
  granted_scopes text[] not null default '{}',
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.google_oauth_tokens (
  connection_id uuid primary key references public.google_connections(id) on delete cascade,
  encrypted_access_token text,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);

create table public.google_locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  google_connection_id uuid not null references public.google_connections(id) on delete cascade,
  google_account_name text not null check (google_account_name ~ '^accounts/[A-Za-z0-9_-]+$'),
  google_location_name text not null check (google_location_name ~ '^locations/[A-Za-z0-9_-]+$'),
  title text not null,
  store_code text,
  is_selected boolean not null default false,
  is_enabled boolean not null default true,
  last_review_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, google_account_name, google_location_name)
);

create index google_connections_company_id_idx on public.google_connections(company_id);
create index google_locations_company_id_idx on public.google_locations(company_id);
create index google_locations_connection_id_idx on public.google_locations(google_connection_id);
create index google_locations_selected_idx on public.google_locations(company_id) where is_selected and is_enabled;

create trigger google_connections_updated_at before update on public.google_connections
for each row execute function public.set_updated_at();
create trigger google_locations_updated_at before update on public.google_locations
for each row execute function public.set_updated_at();

create function private.is_company_owner(check_company_id uuid, check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_platform_admin(check_user_id) or exists (
    select 1 from public.company_members m
    where m.company_id = check_company_id
      and m.user_id = check_user_id
      and m.member_role = 'business_owner'
      and m.status = 'active'
  )
$$;
revoke all on function private.is_company_owner(uuid, uuid) from public;
grant execute on function private.is_company_owner(uuid, uuid) to authenticated;

alter table public.google_connections enable row level security;
alter table private.google_oauth_tokens enable row level security;
alter table public.google_locations enable row level security;

create policy google_connections_select_company on public.google_connections for select to authenticated
using ((select private.has_company_access(company_id)));
create policy google_connections_insert_owner on public.google_connections for insert to authenticated
with check ((select private.is_company_owner(company_id)) and connected_by_user_id = (select auth.uid()));
create policy google_connections_update_owner on public.google_connections for update to authenticated
using ((select private.is_company_owner(company_id)))
with check ((select private.is_company_owner(company_id)));
create policy google_connections_delete_owner on public.google_connections for delete to authenticated
using ((select private.is_company_owner(company_id)));

create policy google_locations_select_company on public.google_locations for select to authenticated
using ((select private.has_company_access(company_id)));
create policy google_locations_insert_owner on public.google_locations for insert to authenticated
with check ((select private.is_company_owner(company_id)));
create policy google_locations_update_owner on public.google_locations for update to authenticated
using ((select private.is_company_owner(company_id)))
with check ((select private.is_company_owner(company_id)));
create policy google_locations_delete_owner on public.google_locations for delete to authenticated
using ((select private.is_company_owner(company_id)));

-- Token RPCs are callable only with the server-side service-role key.
create function public.store_google_oauth_tokens(
  target_connection_id uuid,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  expires_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.google_oauth_tokens (connection_id, encrypted_access_token, encrypted_refresh_token)
  values (target_connection_id, access_token_ciphertext, refresh_token_ciphertext)
  on conflict (connection_id) do update set
    encrypted_access_token = excluded.encrypted_access_token,
    encrypted_refresh_token = excluded.encrypted_refresh_token,
    updated_at = now();
  update public.google_connections set token_expires_at = expires_at, status = 'active', last_error_code = null
  where id = target_connection_id;
end $$;

create function public.get_google_oauth_tokens(target_connection_id uuid)
returns table (encrypted_access_token text, encrypted_refresh_token text)
language sql stable security definer set search_path = '' as $$
  select t.encrypted_access_token, t.encrypted_refresh_token
  from private.google_oauth_tokens t where t.connection_id = target_connection_id
$$;

revoke all on function public.store_google_oauth_tokens(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_google_oauth_tokens(uuid) from public, anon, authenticated;
grant execute on function public.store_google_oauth_tokens(uuid, text, text, timestamptz) to service_role;
grant execute on function public.get_google_oauth_tokens(uuid) to service_role;
