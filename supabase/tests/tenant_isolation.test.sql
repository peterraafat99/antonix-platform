begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@test.local', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@test.local', '', now(), '{}', '{}', now(), now());
update public.profiles set global_role = 'platform_admin' where id = '00000000-0000-0000-0000-000000000001';
insert into public.companies (id, name, slug) values
('10000000-0000-0000-0000-000000000001', 'Company A', 'company-a'),
('10000000-0000-0000-0000-000000000002', 'Company B', 'company-b');
insert into public.company_members (company_id, user_id, member_role) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'business_owner'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'business_owner');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select results_eq('select slug from public.companies order by slug', array['company-a'], 'owner A sees only company A');
select is_empty($$ select * from public.companies where slug = 'company-b' $$, 'owner A cannot read company B');
select is_empty($$ update public.companies set name = 'Hacked' where slug = 'company-b' returning id $$, 'owner cannot update another tenant');
select results_eq('select count(*)::bigint from public.company_members', array[1::bigint], 'owner sees only own company memberships');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select results_eq('select count(*)::bigint from public.companies', array[2::bigint], 'admin sees all companies');
select lives_ok($$ update public.companies set name = 'Company B Updated' where slug = 'company-b' $$, 'admin can update companies');

select * from finish();
rollback;
