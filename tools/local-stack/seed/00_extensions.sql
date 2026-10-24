-- Supabase-compatible scaffolding that pg_dump does not carry.
--
-- * the `extensions` schema  — the restored tables use defaults like
--   `extensions.uuid_generate_v4()`, so the schema and the extension must
--   exist under that exact name.
-- * pgcrypto               — the local API shim verifies and hashes passwords
--   with crypt()/gen_salt(); those calls are unqualified, so the extension
--   has to be REACHABLE through the search_path.
--
-- WHERE pgcrypto LIVES MATTERS
-- -----------------------------
-- It is installed in `extensions`, NOT in `public`, and that is deliberate:
--
--   * `public` carries `USAGE` for `anon` and `authenticated`, so a
--     function that lives there is callable by anyone who can reach the
--     database — and `crypt()` is a password-hash oracle.  The live
--     database has pgcrypto in `extensions`, whose schema carries no grant
--     at all, so only the owner can call it.
--   * the local stack used to install it in `public`, which made a REBUILT
--     environment less safe than the one it replaced.  The two are now the
--     same.
--
-- The calls stay unqualified and resolve through the database's
-- `search_path`, which ends with `extensions` — exactly as on Supabase.
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Keep `extensions` reachable for unqualified calls, as on Supabase.
-- The database name is taken from the connection, so this file works on a
-- database of any name.
do $$
begin
  execute format(
    'alter database %I set search_path = "$user", public, extensions',
    current_database()
  );
end
$$;
