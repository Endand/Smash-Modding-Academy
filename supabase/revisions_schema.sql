-- Run this in the Supabase SQL Editor.
-- Adds: the edit-approval queue. Editors' changes land here as proposals
-- instead of going straight into site_content; a professor/assistant with
-- approve rights on that lesson applies or rejects them.
--
-- This migration is ADDITIVE ONLY — it creates a new table and touches
-- nothing that already exists, so running it cannot break current editing.
-- Tightening site_content writes is a separate migration (see the note at
-- the bottom); until that runs, the approval flow is enforced by the UI.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Proposed changes. One row per content key per editing action.
--    `batch_id` groups the several keys a single action touches (adding a
--    block writes content + type + count, etc.) so a reviewer approves or
--    rejects them together and can't half-apply a structural change.
--    `base_value` records what the editor saw, so the reviewer can be warned
--    when the live value has moved on since the proposal was made.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_revisions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL,
  new_value   text        NOT NULL,
  base_value  text,                      -- live value when the edit was made (NULL = key didn't exist)
  course_id   text,                      -- for scoping the review UI
  lesson_key  text,                      -- NULL for course-level keys
  batch_id    uuid        NOT NULL,      -- groups one editing action
  label       text,                      -- human summary, e.g. "Add resource"
  author_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid        REFERENCES auth.users(id),
  reviewed_at timestamptz,
  note        text                       -- optional reviewer comment
);

-- Reviewers list pending work by lesson/course; the provider overlays an
-- author's own pending edits on every page load. Both want fast lookups.
CREATE INDEX IF NOT EXISTS content_revisions_pending_scope
  ON public.content_revisions (status, course_id, lesson_key);

CREATE INDEX IF NOT EXISTS content_revisions_pending_author
  ON public.content_revisions (status, author_id);

CREATE INDEX IF NOT EXISTS content_revisions_batch
  ON public.content_revisions (batch_id);

-- One live proposal per key per author: re-editing the same field supersedes
-- the earlier proposal instead of queueing a chain of intermediate states for
-- the reviewer to wade through.
CREATE UNIQUE INDEX IF NOT EXISTS content_revisions_one_pending_per_key
  ON public.content_revisions (key, author_id)
  WHERE status = 'pending';

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS. Deliberately modest for this phase — which role may *approve* is
--    enforced in the UI, matching how the rest of the permission system works
--    today. What the DB does guarantee here: nobody can forge a proposal in
--    someone else's name, and readers/anonymous visitors never see pending
--    edits at all (so unapproved text can't leak into the public site).
-- ─────────────────────────────────────────────────────────────────────────────

-- Authors see their own proposals; any role-holder (reviewers) sees all of them.
CREATE POLICY "content_revisions_select"
  ON public.content_revisions FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (is_admin = true OR role IS NOT NULL)
    )
  );

-- Role-holders may propose, but only as themselves and only as 'pending'.
CREATE POLICY "content_revisions_insert"
  ON public.content_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (is_admin = true OR role IS NOT NULL)
    )
  );

-- Reviewers set approved/rejected; authors may withdraw their own pending row.
CREATE POLICY "content_revisions_update"
  ON public.content_revisions FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (is_admin = true OR role IS NOT NULL)
    )
  );

-- An author can drop their own pending proposal.
CREATE POLICY "content_revisions_delete"
  ON public.content_revisions FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() AND status = 'pending');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Realtime, so a reviewer's pending badge updates live and an editor sees
--    their proposal flip to approved without a refresh.
-- ─────────────────────────────────────────────────────────────────────────────
-- Non-fatal: realtime is a convenience, not a requirement. If this step can't
-- run, the rest of the migration still applies and badges update on refresh.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.content_revisions;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Realtime not enabled for content_revisions (%). Everything else applied; pending badges will update on page refresh instead of instantly.', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOT INCLUDED HERE, ON PURPOSE:
--   Restricting site_content writes to approvers only. Today's policy is
--   "is_admin OR role IS NOT NULL" for every key, so an editor could still
--   bypass the queue by calling the REST API directly. Closing that is a
--   separate migration, because a wrong policy on site_content locks everyone
--   out of editing the live site. Run this one, prove the workflow, then apply
--   the tightening migration.
-- ─────────────────────────────────────────────────────────────────────────────
