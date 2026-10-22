-- Local-mirror ACL parity with the live project.
--
-- The live project grants EXECUTE on its public functions to `service_role`
-- for every function, because Supabase's project-level default privileges
-- (alter default privileges ... on functions to service_role) applied to each
-- function when it was created.  pg_dump does not dump ALTER DEFAULT
-- PRIVILEGES, so the restore lost that layer: only the 41 functions named
-- explicitly by migration 07 carry the grant locally.
--
-- `service_role` is the trusted backend role (it bypasses RLS and owns the
-- write path), so the grant is not a widening of the attack surface — it
-- restores what the original project had.  `anon` and `authenticated` are
-- NOT given a blanket function grant: the app's 38 callable functions keep
-- their explicit, per-function grants from migration 07.

begin;

grant execute on all functions in schema public to service_role;

-- future functions inherit the same floor
alter default privileges in schema public
  grant execute on functions to service_role;

commit;
