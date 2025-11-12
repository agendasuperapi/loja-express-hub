-- Enable RLS on all public tables that are missing it
-- Execute this in Supabase SQL Editor

-- Enable RLS on store_instances
ALTER TABLE public.store_instances ENABLE ROW LEVEL SECURITY;

-- Store owners and admins can view their store instances
CREATE POLICY "Store owners can view their instances"
  ON public.store_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_instances.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Store owners and admins can insert their store instances
CREATE POLICY "Store owners can insert their instances"
  ON public.store_instances
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_instances.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Store owners and admins can update their store instances
CREATE POLICY "Store owners can update their instances"
  ON public.store_instances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_instances.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Store owners and admins can delete their store instances
CREATE POLICY "Store owners can delete their instances"
  ON public.store_instances
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_instances.store_id
      AND (stores.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Verify all tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
