-- ============================================================================
-- 20260929_05_decision_notifications.sql — approval-decision notifications
-- (Prime §D7: "Wire orphaned real features: … approval-decision notifications")
-- ---------------------------------------------------------------------------
-- When a record leaves pending_review via a decision (→ approved | rejected),
-- the record's CREATOR receives a notification. The write happens inside the
-- database on the decision edge itself — a SECURITY DEFINER trigger function
-- — so it fires for every real path (record_transition, bulk approve,
-- ApprovalQueuePage, future clients alike) and can never be skipped, forged
-- or spoofed by the browser (§5/§15: the browser never writes tables
-- directly; the actor identity is server-derived from the JWT, never from
-- the client payload).
--
-- Recipient resolution: records.created_by carries the creator's profile
-- EMAIL on every write path (validated in the record engine). The trigger
-- resolves that email to the profiles.user_id and addresses the row to
-- them. If no profile matches (legacy/external rows), nothing is inserted —
-- no orphan notification addressed to nobody.
--
-- Self-decision rule: an approver never gets notified about their own
-- decision.
--
-- Additive/idempotent: a function + trigger replace; no data touched.
-- Rollback: drop trigger trg_notify_on_record_decision on public.records;
--           drop function public.notify_on_record_decision();
-- Verified by the local battery (L-section, verify.sql) on the throwaway
-- test cluster — production is NOT touched here.
-- ============================================================================

create or replace function public.notify_on_record_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_user_id uuid;
  v_actor_email     text;
begin
  -- Decision edges only: pending_review → approved | rejected. Drafts,
  -- submissions, reopens and restores follow other flows and do not notify.
  if new.status = old.status then
    return new;
  end if;
  if not (old.status::text = 'pending_review'
          and new.status::text in ('approved', 'rejected')) then
    return new;
  end if;

  -- Resolve the creator to a real user (RLS on notifications requires a
  -- real user_id; a notification addressed to nobody would be an orphan —
  -- §15 forbids it).
  select p.user_id into v_creator_user_id
    from public.profiles p
   where p.email = new.created_by
   limit 1;
  if v_creator_user_id is null then
    return new;
  end if;

  -- The actor already knows the decision they just made.
  if v_creator_user_id = auth.uid() then
    return new;
  end if;

  select email into v_actor_email
    from public.profiles where user_id = auth.uid() limit 1;

  insert into public.notifications
    (user_id, category, priority, event_type, title, message, link,
     data, actor_id, target_id, read, created_by)
  values (
    v_creator_user_id,
    'records',
    case new.status::text when 'approved' then 'important' else 'critical' end,
    'approval_decision',
    case new.status::text
      when 'approved' then 'Record approved'
      else 'Record rejected'
    end,
    'Record ' || new.serial || ' was ' || new.status::text ||
      ' by ' || coalesce(v_actor_email, 'a reviewer') || '.',
    '/records/' || new.serial,
    jsonb_build_object(
      'record_id',   new.id,
      'serial',      new.serial,
      'form_code',   new.form_code,
      'from_status', old.status::text,
      'to_status',   new.status::text,
      'decided_by',  coalesce(v_actor_email, auth.uid()::text)
    ),
    auth.uid()::text,
    new.id::text,
    false,
    coalesce(v_actor_email, auth.uid()::text)
  );

  return new;
end;
$$;

-- Fire on every status write, whatever path performs it.
drop trigger if exists trg_notify_on_record_decision on public.records;
create trigger trg_notify_on_record_decision
  after update of status on public.records
  for each row
  execute function public.notify_on_record_decision();

comment on function public.notify_on_record_decision() is
  'Prime 20260929_05: fires on records.status decision edges (pending_review → approved|rejected); inserts one notifications row for the creator (resolved server-side by profile email). SECURITY DEFINER so the browser never writes the notifications table directly (§5); skips self-decisions and creators without a resolvable profile (no orphans, §15).';