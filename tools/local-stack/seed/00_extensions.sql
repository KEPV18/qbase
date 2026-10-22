-- Supabase-compatible scaffolding that pg_dump does not carry.
--
-- * the `extensions` schema  — the restored tables use defaults like
--   `extensions.uuid_generate_v4()`, so the schema and the extension must
--   exist under that exact name.
-- * pgcrypto               — the local API shim verifies and hashes passwords
--   with crypt()/gen_salt(); those calls are unqualified, so the extension is
--   installed in `public` (the default search_path) for the local mirror.
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema public;

-- keep `extensions` reachable for unqualified calls, as on Supabase
alter database qbase_local set search_path = "$user", public, extensions;
