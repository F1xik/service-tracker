-- PostgREST requires explicit table-level GRANT alongside RLS policies.
-- The appointments table was created in 0003 without these grants, causing
-- all requests to return 403 (PostgreSQL error 42501 / insufficient privilege).
-- income_entries, services, and profiles inherited grants from earlier setup;
-- appointments needs them added explicitly.

grant select, insert, update, delete on table public.appointments
  to authenticated, anon, service_role;

-- The create_appointment function runs as security invoker (caller's role),
-- so the authenticated role also needs EXECUTE.
grant execute on function public.create_appointment(date, text, text, numeric, jsonb)
  to authenticated, anon;
