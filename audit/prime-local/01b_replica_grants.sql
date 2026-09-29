-- prime-local/01b_replica_grants.sql — TEST-ONLY
-- Mirrors Supabase's default privileges (OpenAPI exposes GET/POST/PATCH/DELETE
-- on all 17 tables → every table is granted to anon/authenticated; RLS is the
-- control). Applied AFTER the prime migrations so record_versions is included.
-- Run as superuser "postgres".
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;