-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query →
-- paste → Run). Safe to run more than once.
--
-- Adds two things:
--   1. Two storage buckets: `lesson-files` (attachments staff put in a lesson)
--      and `project-files` (builds learners post on a project).
--   2. `project_submissions` — one row per person per project lesson, holding
--      their repository link, an optional showcase link and an optional file.
--
-- Everything here is ADDITIVE. It creates new buckets, a new table and new
-- policies, and touches nothing that already exists, so running it cannot
-- break the site as it stands.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Storage buckets
--
--    Both are public-read: lesson attachments are part of published lessons,
--    and project files are meant for other learners to download. They are kept
--    separate so the WRITE rules can differ. Only staff write lesson-files;
--    any signed-in account writes project-files.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('lesson-files', 'lesson-files', true, 52428800)   --  50 MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project-files', 'project-files', true, 26214400) --  25 MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 26214400;

-- Anyone, signed in or not, may download from either bucket.
DROP POLICY IF EXISTS "lesson_files_public_read" ON storage.objects;
CREATE POLICY "lesson_files_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'lesson-files');

DROP POLICY IF EXISTS "project_files_public_read" ON storage.objects;
CREATE POLICY "project_files_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'project-files');

-- Lesson attachments: staff only (admin, or anyone holding a role). Which
-- lesson a person may attach to is enforced in the UI, exactly as it is for
-- lesson text today.
DROP POLICY IF EXISTS "lesson_files_staff_write" ON storage.objects;
CREATE POLICY "lesson_files_staff_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (is_admin = true OR role IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "lesson_files_staff_delete" ON storage.objects;
CREATE POLICY "lesson_files_staff_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lesson-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (is_admin = true OR role IS NOT NULL)
    )
  );

-- Project files: any signed-in account may upload one.
DROP POLICY IF EXISTS "project_files_member_write" ON storage.objects;
CREATE POLICY "project_files_member_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-files');

-- You can delete what you uploaded; staff can delete anything, for moderation.
DROP POLICY IF EXISTS "project_files_owner_delete" ON storage.objects;
CREATE POLICY "project_files_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (is_admin = true OR role IS NOT NULL)
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Project submissions
--
--    One row per person per project lesson. Re-posting replaces what's there
--    (the site upserts on lesson_key + user_id), so a project shows one
--    current solution per person rather than a pile of revisions.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_key text        NOT NULL,
  course_id  text,                       -- for grouping and future moderation views
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text,                       -- filled by trigger; never trusted from the client
  repo_url   text        NOT NULL,
  live_url   text,
  file_url   text,
  file_name  text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_submissions_one_per_lesson UNIQUE (lesson_key, user_id)
);

CREATE INDEX IF NOT EXISTS project_submissions_lesson
  ON public.project_submissions (lesson_key, created_at DESC);

-- The display name is stamped from the profiles table rather than accepted
-- from the browser, so nobody can post under someone else's name. SECURITY
-- DEFINER so the lookup works regardless of who is inserting.
CREATE OR REPLACE FUNCTION public.project_submissions_stamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT username INTO NEW.username FROM public.profiles WHERE id = NEW.user_id;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_submissions_stamp_trg ON public.project_submissions;
CREATE TRIGGER project_submissions_stamp_trg
  BEFORE INSERT OR UPDATE ON public.project_submissions
  FOR EACH ROW EXECUTE FUNCTION public.project_submissions_stamp();

ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

-- Submissions are meant to be read by everyone, including signed-out visitors.
DROP POLICY IF EXISTS "project_submissions_select" ON public.project_submissions;
CREATE POLICY "project_submissions_select"
  ON public.project_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

-- You may only post as yourself.
DROP POLICY IF EXISTS "project_submissions_insert" ON public.project_submissions;
CREATE POLICY "project_submissions_insert"
  ON public.project_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- You may only edit your own row, and may not hand it to somebody else.
DROP POLICY IF EXISTS "project_submissions_update" ON public.project_submissions;
CREATE POLICY "project_submissions_update"
  ON public.project_submissions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- You may withdraw your own; staff may remove anything, for moderation.
DROP POLICY IF EXISTS "project_submissions_delete" ON public.project_submissions;
CREATE POLICY "project_submissions_delete"
  ON public.project_submissions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (is_admin = true OR role IS NOT NULL)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Realtime, so a new submission appears for people already on the page.
--    Non-fatal: if this cannot run, everything else still applies and the list
--    refreshes when the page does.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_submissions;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Realtime not enabled for project_submissions (%). Everything else applied.', SQLERRM;
END $$;
