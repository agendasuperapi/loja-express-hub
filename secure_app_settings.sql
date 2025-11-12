-- Secure the app_settings table
-- This table contains sensitive credentials and must be protected
-- Execute this in Supabase SQL Editor

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read app_settings
CREATE POLICY "Admins can view app settings"
  ON public.app_settings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert app_settings
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update app_settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete app_settings
CREATE POLICY "Admins can delete app settings"
  ON public.app_settings
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
