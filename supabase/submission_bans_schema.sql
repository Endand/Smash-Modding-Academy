-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query →
-- paste → Run). Safe to run more than once.
--
-- Adds: an admin switch that stops one account posting project submissions,
-- for dealing with spam. Fully reversible, and it hides nothing that was
-- already posted: existing submissions stay until an admin removes them.
--
-- ADDITIVE. It adds one column, one function, and replaces three policies
-- with the same rules plus a ban check. Nothing else is touched.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS submissions_banned boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The switch. SECURITY DEFINER because `authenticated` may only update
--    their own username (see features_schema.sql), so the flag cannot be set
--    by the account it applies to. The admin check is inside the function:
--    anyone else calling it gets an error, not a silent no-op.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_submission_ban(target_id uuid, banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only an admin can ban an account from posting submissions';
  END IF;
  UPDATE profiles SET submissions_banned = banned WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_submission_ban(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_submission_ban(uuid, boolean) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Enforcement in the database rather than only in the page. A banned
--    account that calls the REST API directly is refused just the same,
--    which is the whole point of a ban on someone posting in volume.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_submission_banned()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND submissions_banned = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_submission_banned() TO authenticated;

DROP POLICY IF EXISTS "project_submissions_insert" ON public.project_submissions;
CREATE POLICY "project_submissions_insert"
  ON public.project_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_submission_banned());

DROP POLICY IF EXISTS "project_submissions_update" ON public.project_submissions;
CREATE POLICY "project_submissions_update"
  ON public.project_submissions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_submission_banned());

-- Uploads too, or a banned account could still fill the bucket with files
-- that no submission row ever points at.
DROP POLICY IF EXISTS "project_files_member_write" ON storage.objects;
CREATE POLICY "project_files_member_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND NOT public.is_submission_banned());

-- Deleting is deliberately still allowed while banned: someone should always
-- be able to withdraw their own work.

-- Verify:
--   SELECT username, submissions_banned FROM public.profiles WHERE submissions_banned;
-- Undo entirely:
--   UPDATE public.profiles SET submissions_banned = false;
