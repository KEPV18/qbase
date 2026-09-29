-- prime-local/01b_replica_grants.sql — TEST-ONLY
-- Mirrors Supabase's default privileges (OpenAPI exposes GET/POST/PATCH/DELETE
-- on all 17 tables → every table is granted to anon/authenticated; RLS is the
-- control). Applied AFTER the prime migrations so record_versions is included.
-- Run as superuser "postgres".
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
-- notifications: mirror production's read-own / update-own policies
-- (20260614_security_hardening.sql §5). Production has NO insert policy
-- either — only the SECURITY DEFINER decision trigger (prime
-- 20260929_05) writes rows; the replica keeps that surface so L4 proves
-- the read-own boundary, not the replica-only default-deny.
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
