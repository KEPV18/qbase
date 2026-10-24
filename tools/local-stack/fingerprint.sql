-- ============================================================================
-- The fingerprint of a database's schema.
--
-- Run it against two databases and diff the two outputs: if they are the
-- same, the two databases have the same structure — the same tables, the
-- same columns, the same constraints, the same policies, the same grants,
-- the same functions with the same ACLs.
--
-- It is what proves that a REBUILD of the local environment reproduces the
-- environment that was there before (see tools/local-stack/compare-rebuild.sh).
--
-- The output is a sorted list of `kind | name | definition` lines, so two
-- fingerprints can be compared with `diff` directly.
--
-- It reads the catalogue only.  It prints no row of user data, and it
-- changes nothing.
-- ============================================================================

-- ── the tables, their RLS state and their columns ────────────────────────
select 'TABLE' as kind,
       c.relname || '.' || a.attname as name,
       concat(
         c.relrowsecurity, '|',
         c.relforcerowsecurity, '|',
         format_type(a.atttypid, a.atttypmod), '|',
         a.attnotnull, '|',
         coalesce(pg_get_expr(d.adbin, d.adrelid), ''),
         '|',
         case when a.attcollation <> 0 then a.attcollation::regcollation::text else '' end
       ) as definition
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
 where n.nspname = 'public' and c.relkind in ('r', 'p')
union all
-- ── the constraints ───────────────────────────────────────────────────────
select 'CONSTRAINT',
       c.relname || '.' || con.conname,
       concat(con.contype, '|', pg_get_constraintdef(con.oid))
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
union all
-- ── the indexes ───────────────────────────────────────────────────────────
select 'INDEX', c.relname || '.' || i.relname, pg_get_indexdef(i.oid)
  from pg_index x
  join pg_class i on i.oid = x.indexrelid
  join pg_class c on c.oid = x.indrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
union all
-- ── the triggers ──────────────────────────────────────────────────────────
select 'TRIGGER', c.relname || '.' || tg.tgname, pg_get_triggerdef(tg.oid)
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not tg.tgisinternal
union all
-- ── the RLS policies ──────────────────────────────────────────────────────
select 'POLICY',
       p.schemaname || '.' || p.tablename || '.' || p.policyname,
       concat(p.permissive, '|', p.cmd, '|', p.roles::text, '|',
              coalesce(p.qual, ''), '|', coalesce(p.with_check, ''))
  from pg_policies p
 where p.schemaname = 'public'
union all
-- ── the table grants ──────────────────────────────────────────────────────
select 'GRANT', table_schema || '.' || table_name || '.' || grantee,
       privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee in ('anon', 'authenticated', 'service_role')
union all
-- ── the functions, their bodies and their ACLs ────────────────────────────
select 'FUNCTION', p.proname || '(' || pg_get_function_arguments(p.oid) || ')',
       concat(
         p.prosecdef, '|',
         p.provolatile, '|',
         coalesce(array_to_string(p.proconfig, ','), ''), '|',
         coalesce(p.proacl::text, ''), '|',
         md5(p.prosrc)
       )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
union all
-- ── the enums and the domains ─────────────────────────────────────────────
select 'TYPE', t.typname, t.typtype::text
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
 where n.nspname = 'public' and t.typtype in ('e', 'd')
union all
-- ── the views ─────────────────────────────────────────────────────────────
select 'VIEW', c.relname, pg_get_viewdef(c.oid, true)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('v', 'm')
order by 1, 2, 3;
