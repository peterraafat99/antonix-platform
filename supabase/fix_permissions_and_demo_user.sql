-- ==============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ALL TABLE PERMISSIONS & DEMO USER
-- ==============================================================================

-- 1. Grant table permissions to authenticated role (used by logged-in users)
grant usage on schema public to authenticated, anon, service_role;
grant usage on schema private to authenticated, anon, service_role;

grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.companies to authenticated, service_role;
grant select, insert, update, delete on public.company_members to authenticated, service_role;
grant select, insert, update, delete on public.google_connections to authenticated, service_role;
grant select, insert, update, delete on public.google_locations to authenticated, service_role;

-- 2. Phase 3 AI tables (if created)
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant all on all routines in schema public to authenticated, service_role;

-- 3. Ensure Demo Company exists
insert into public.companies (id, name, slug, is_enabled)
values ('11111111-1111-1111-1111-111111111111', 'Demo Client Business', 'demo-client-business', true)
on conflict (slug) do update set is_enabled = true;

-- 4. Ensure Profiles and Memberships exist for all auth users
insert into public.profiles (id, full_name, global_role)
select id, coalesce(raw_user_meta_data->>'full_name', email), 'platform_admin'
from auth.users
on conflict (id) do update set global_role = 'platform_admin';

insert into public.company_members (company_id, user_id, member_role, status)
select '11111111-1111-1111-1111-111111111111', id, 'business_owner', 'active'
from auth.users
on conflict (company_id, user_id) do update set status = 'active', member_role = 'business_owner';
