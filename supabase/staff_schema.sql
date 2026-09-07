-- Run this in the Supabase SQL Editor.
-- Adds: a public staff directory, so the /team page can group contributors by
-- their role for visitors who are not signed in.
--
-- Why this is needed: profiles is readable only "to authenticated", so an
-- anonymous visitor querying it gets an empty list and the team page would be
-- blank for exactly the people it is meant for. Rather than opening up the
-- whole profiles table, this exposes a view with two columns and only for
-- people who are staff.
--
-- What becomes public: the username and role of staff members. Nothing else.
-- Email addresses, ids and join dates stay private, and non-staff accounts do
-- not appear at all. Usernames of contributors are already visible on lessons
-- as author and editor credits, so this mainly adds the role label.
--
-- ADDITIVE ONLY. It creates one view and grants read on it; no existing table,
-- policy or permission is modified. Dropping the view fully undoes it.

-- Admins often have no role set, but they do write lessons, so they are
-- included and labelled Admin rather than being left off the team page.
CREATE OR REPLACE VIEW public.staff_directory
WITH (security_invoker = false) AS
  SELECT
    p.username,
    COALESCE(p.role, 'Admin') AS role
  FROM public.profiles p
  WHERE p.role IS NOT NULL OR p.is_admin = true;

-- security_invoker = false means the view runs with its owner's rights, which
-- is what lets it read past the profiles RLS policy. That is deliberate: it is
-- the entire point of the view, and its SELECT list is what limits exposure.
GRANT SELECT ON public.staff_directory TO anon, authenticated;

-- Verify:
--   SELECT * FROM public.staff_directory ORDER BY role, username;
-- Undo:
--   DROP VIEW IF EXISTS public.staff_directory;
