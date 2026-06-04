-- Atomic appointment edit: update one appointment + replace its line items
-- in a single transaction.
--
-- Mirrors create_appointment (0003): runs as the caller (security invoker) so
-- RLS and the income_entries ownership/amount backstop trigger still apply.
-- `amount_earned` is supplied by the client (computed via src/lib/calc.ts) —
-- this function never computes it, honoring the snapshot invariant. Editing an
-- appointment is a deliberate user action, distinct from the "never recalc
-- after insert" rule which only forbids implicitly touching entries when a
-- service price or the profile commission changes.
--
-- The line items are replaced wholesale (delete + re-insert) rather than
-- diffed; the function body is one transaction so the appointment and all its
-- lines update together or not at all. `created_at` and `source` on the
-- appointment are preserved (not overwritten).
create or replace function public.update_appointment(
  p_id uuid,
  p_provided_on date,
  p_customer text,
  p_note text,
  p_tip numeric,
  p_lines jsonb
)
returns appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_appointment appointments;
  v_line jsonb;
begin
  update public.appointments
  set provided_on = p_provided_on,
      customer = p_customer,
      note = p_note,
      tip = coalesce(p_tip, 0)
  where id = p_id and user_id = auth.uid()
  returning * into v_appointment;

  if not found then
    raise exception 'appointment % not found', p_id;
  end if;

  delete from public.income_entries where appointment_id = p_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.income_entries (
      user_id,
      appointment_id,
      service_id,
      price_snapshot,
      commission_pct_snapshot,
      amount_earned
    )
    values (
      auth.uid(),
      v_appointment.id,
      (v_line ->> 'service_id')::uuid,
      (v_line ->> 'price_snapshot')::numeric,
      (v_line ->> 'commission_pct_snapshot')::numeric,
      (v_line ->> 'amount_earned')::numeric
    );
  end loop;

  return v_appointment;
end;
$$;

-- The function runs as security invoker (caller's role), so the authenticated
-- role needs EXECUTE — mirroring the grant for create_appointment in 0004.
grant execute on function public.update_appointment(uuid, date, text, text, numeric, jsonb)
  to authenticated, anon;
