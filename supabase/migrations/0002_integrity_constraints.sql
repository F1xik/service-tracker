-- Code-review follow-up — data-integrity hardening for the financial tables.
-- Adds value constraints, an enum check on income source, and a backstop
-- trigger that enforces ownership of the referenced service plus the
-- amount_earned snapshot invariant. These are defence-in-depth: the canonical
-- earnings formula still lives in src/lib/calc.ts and is computed client-side.

-- ---------------------------------------------------------------------------
-- Value constraints
-- ---------------------------------------------------------------------------

alter table profiles
  add constraint profiles_commission_pct_range
  check (commission_pct >= 0 and commission_pct <= 100);

alter table services
  add constraint services_price_nonnegative
  check (price >= 0);

alter table income_entries
  add constraint income_entries_price_snapshot_nonnegative
  check (price_snapshot >= 0);

alter table income_entries
  add constraint income_entries_commission_pct_range
  check (commission_pct_snapshot >= 0 and commission_pct_snapshot <= 100);

alter table income_entries
  add constraint income_entries_amount_earned_nonnegative
  check (amount_earned >= 0);

alter table income_entries
  add constraint income_entries_source_enum
  check (source in ('manual', 'import'));

-- ---------------------------------------------------------------------------
-- Backstop trigger: service ownership + amount_earned snapshot invariant
-- ---------------------------------------------------------------------------

-- Validates two things the WITH CHECK RLS policy cannot express:
--   1. A referenced service_id must belong to the same user.
--   2. amount_earned must match price_snapshot * commission_pct_snapshot / 100.
-- The amount check allows a one-cent tolerance because the source of truth is
-- the client-side rounding in calc.ts; this only guards against corruption or
-- a tampered client, not the exact rounding mode.
create or replace function public.validate_income_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected numeric;
begin
  if new.service_id is not null then
    if not exists (
      select 1 from public.services s
      where s.id = new.service_id and s.user_id = new.user_id
    ) then
      raise exception 'service_id % does not belong to user %',
        new.service_id, new.user_id;
    end if;
  end if;

  expected := round(new.price_snapshot * new.commission_pct_snapshot / 100, 2);
  if abs(new.amount_earned - expected) > 0.01 then
    raise exception
      'amount_earned % does not match price_snapshot * commission_pct_snapshot / 100 (expected ~%)',
      new.amount_earned, expected;
  end if;

  return new;
end;
$$;

create trigger income_entries_validate
  before insert or update on income_entries
  for each row
  execute function public.validate_income_entry();
