begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'google-admin@test.local', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'google-owner-a@test.local', '', now(), '{}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'google-owner-b@test.local', '', now(), '{}', '{}', now(), now());
update public.profiles set global_role = 'platform_admin' where id = '00000000-0000-0000-0000-000000000011';
insert into public.companies (id, name, slug) values
('10000000-0000-0000-0000-000000000011', 'Google Company A', 'google-company-a'),
('10000000-0000-0000-0000-000000000012', 'Google Company B', 'google-company-b');
insert into public.company_members (company_id, user_id, member_role) values
('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'business_owner'),
('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000013', 'business_owner');
insert into public.google_connections (id, company_id, connected_by_user_id) values
('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012'),
('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000013');
insert into private.google_oauth_tokens (connection_id, encrypted_refresh_token) values
('20000000-0000-0000-0000-000000000011', 'encrypted-a'),
('20000000-0000-0000-0000-000000000012', 'encrypted-b');
insert into public.google_locations (company_id, google_connection_id, google_account_name, google_location_name, title) values
('10000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000011', 'accounts/a', 'locations/a', 'Location A'),
('10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000012', 'accounts/b', 'locations/b', 'Location B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select results_eq('select company_id from public.google_connections', array['10000000-0000-0000-0000-000000000011'::uuid], 'owner sees only own Google connection');
select results_eq('select title from public.google_locations', array['Location A'], 'owner sees only own Google locations');
select is_empty($$ update public.google_connections set status = 'revoked' where company_id = '10000000-0000-0000-0000-000000000012' returning id $$, 'owner cannot update another company connection');
select throws_ok($$ select * from public.get_google_oauth_tokens('20000000-0000-0000-0000-000000000011') $$, '42501', null, 'authenticated users cannot call the token RPC');
select throws_ok($$ select * from private.google_oauth_tokens $$, '42501', null, 'authenticated users cannot read the private token table');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select results_eq('select count(*)::bigint from public.google_connections', array[2::bigint], 'platform admin sees all connection metadata');

select * from finish();
rollback;
