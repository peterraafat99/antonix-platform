-- The server-side mock/OAuth handlers use the service_role key.
-- Bypassing RLS does not replace table privileges, so grant access explicitly.

grant select, insert, update, delete on public.google_connections to service_role;
grant select, insert, update, delete on public.google_locations to service_role;
