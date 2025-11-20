-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new

-- Adicionar coluna flavors na tabela store_addon_templates
ALTER TABLE public.store_addon_templates 
ADD COLUMN IF NOT EXISTS flavors jsonb DEFAULT '[]'::jsonb;
