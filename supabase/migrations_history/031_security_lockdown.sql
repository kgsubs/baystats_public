-- Migration 031: Security lockdown
--
-- Applied to production 2026-09-29.
-- Records changes made directly against the live database that day, after a
-- security review confirmed the anonymous key could call exec_sql (HTTP
-- 204, a no-op statement ran) and the Supabase Security Advisor confirmed
-- the other items below against the live database on 2026-09-30 02:11 UTC.
--
-- Also records a sample-data cleanup that is history only: see the
-- commented statement at the end. It is not run by this migration.

-- Anyone signed in (or, before this revoke, anyone with the anon key) could
-- call these SECURITY DEFINER functions and grant themselves admin, or
-- check admin status for any user id.
REVOKE EXECUTE ON FUNCTION public.add_admin_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Let anyone insert vessel counts with no authentication.
DROP POLICY IF EXISTS vessels_allow_insert ON public.vessel_counts;

-- Pin search_path on every SECURITY DEFINER / callable function so a
-- session-local search_path change cannot redirect an unqualified
-- reference inside the function body.
ALTER FUNCTION public.add_admin_by_email(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_marina_profiles_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_marina_clearance_info(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.format_office_hours_schedule(jsonb) SET search_path = public, pg_temp;

-- Ran arbitrary SQL for anyone who could call it (015_create_exec_sql_function.sql).
-- The live grants were revoked 2026-09-29; this drops the function outright.
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Not run here. Migration 022 seeded sample vessel counts for local
-- development; some were also written to the live vessel_counts table,
-- labeled as manual entries. Delete them by hand once confirmed:
-- delete from vessel_counts where reporter like '%Placeholder%';
