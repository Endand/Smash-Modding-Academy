-- Run this in the Supabase SQL Editor

-- 1. Add is_admin flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Create site_content table for CMS
CREATE TABLE IF NOT EXISTS public.site_content (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid        REFERENCES auth.users(id)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 3. RLS: everyone can read
CREATE POLICY "site_content_select"
  ON public.site_content FOR SELECT
  USING (true);

-- 4. RLS: only admins can write
CREATE POLICY "site_content_insert"
  ON public.site_content FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "site_content_update"
  ON public.site_content FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 5. Enable realtime for site_content
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;

-- 6. Grant yourself admin (replace with your actual user id from auth.users)
-- UPDATE public.profiles SET is_admin = true WHERE id = '<your-user-uuid>';
