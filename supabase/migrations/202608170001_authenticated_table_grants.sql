-- Grant the authenticated role the table privileges required by the RLS policies.
-- RLS still limits each operation to the user's own profile, memberships, or company.

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.company_members to authenticated;

grant select, insert, update, delete on public.google_connections to authenticated;
grant select, insert, update, delete on public.google_locations to authenticated;
