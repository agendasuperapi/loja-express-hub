-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new

-- Tabela para armazenar templates de adicionais customizados das lojas
CREATE TABLE IF NOT EXISTS public.store_addon_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text DEFAULT '📦',
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  flavors jsonb DEFAULT '[]'::jsonb,
  is_custom boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índice para buscar templates por loja
CREATE INDEX IF NOT EXISTS idx_store_addon_templates_store_id 
ON public.store_addon_templates(store_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_store_addon_templates_updated_at
  BEFORE UPDATE ON public.store_addon_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.store_addon_templates ENABLE ROW LEVEL SECURITY;

-- Donos de loja podem ver seus próprios templates
CREATE POLICY "Store owners can view their templates"
  ON public.store_addon_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_addon_templates.store_id
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Donos de loja podem criar templates
CREATE POLICY "Store owners can create templates"
  ON public.store_addon_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_addon_templates.store_id
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Donos de loja podem atualizar seus templates
CREATE POLICY "Store owners can update their templates"
  ON public.store_addon_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_addon_templates.store_id
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Donos de loja podem deletar seus templates
CREATE POLICY "Store owners can delete their templates"
  ON public.store_addon_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_addon_templates.store_id
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );
