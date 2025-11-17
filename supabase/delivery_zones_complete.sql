-- =====================================================
-- Migration: Create Delivery Zones System
-- Description: Sistema de gerenciamento de zonas de entrega
--              com taxas por cidade e bairro
-- =====================================================

-- 1. CREATE TABLE delivery_zones
-- =====================================================
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  neighborhood TEXT NULL, -- NULL = taxa padrão da cidade inteira
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: Não permitir duplicatas de cidade + bairro para mesma loja
  CONSTRAINT unique_store_city_neighborhood UNIQUE(store_id, city, neighborhood),
  
  -- Constraint: Taxa de entrega não pode ser negativa
  CONSTRAINT positive_delivery_fee CHECK (delivery_fee >= 0)
);

-- 2. CREATE INDEXES
-- =====================================================
-- Índice para buscar zonas de uma loja específica
CREATE INDEX IF NOT EXISTS idx_delivery_zones_store_id 
  ON public.delivery_zones(store_id);

-- Índice para buscar por cidade
CREATE INDEX IF NOT EXISTS idx_delivery_zones_city 
  ON public.delivery_zones(city);

-- Índice composto para buscar zonas ativas de uma loja
CREATE INDEX IF NOT EXISTS idx_delivery_zones_store_active 
  ON public.delivery_zones(store_id, is_active);

-- 3. CREATE TRIGGER
-- =====================================================
-- Trigger para atualizar automaticamente o campo updated_at
CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- =====================================================

-- Política: Donos de loja podem gerenciar suas zonas de entrega
CREATE POLICY "Store owners can manage delivery zones"
  ON public.delivery_zones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM public.stores
      WHERE stores.id = delivery_zones.store_id
        AND stores.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Política: Qualquer pessoa pode visualizar zonas ativas (para calcular frete)
CREATE POLICY "Anyone can view active delivery zones"
  ON public.delivery_zones
  FOR SELECT
  USING (is_active = true);

-- 6. UPDATE DEFAULT EMPLOYEE PERMISSIONS
-- =====================================================
-- Atualizar as permissões padrão dos funcionários para incluir 'delivery'
-- Obs: Isso afeta apenas novos funcionários. Funcionários existentes 
--      precisam ter suas permissões atualizadas manualmente se necessário.

ALTER TABLE public.store_employees 
  ALTER COLUMN permissions 
  SET DEFAULT '{
    "orders": {
      "view": true,
      "create": true,
      "update": true,
      "delete": false
    },
    "products": {
      "view": true,
      "create": false,
      "update": false,
      "delete": false
    },
    "categories": {
      "view": true,
      "create": false,
      "update": false,
      "delete": false
    },
    "coupons": {
      "view": true,
      "create": false,
      "update": false,
      "delete": false
    },
    "delivery": {
      "view": true,
      "create": false,
      "update": false,
      "delete": false
    },
    "employees": {
      "view": false,
      "create": false,
      "update": false,
      "delete": false
    },
    "reports": {
      "view": false
    },
    "settings": {
      "view": false,
      "update": false
    }
  }'::jsonb;

-- 7. GRANT PERMISSIONS
-- =====================================================
-- Garantir que os usuários autenticados possam acessar a tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- COMO USAR:
-- 1. Copie todo este código
-- 2. Vá para: https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new
-- 3. Cole o código no editor SQL
-- 4. Clique em "Run" para executar
-- 5. Verifique se não há erros no console

-- ROLLBACK (se necessário):
-- DROP TRIGGER IF EXISTS update_delivery_zones_updated_at ON public.delivery_zones;
-- DROP INDEX IF EXISTS idx_delivery_zones_store_id;
-- DROP INDEX IF EXISTS idx_delivery_zones_city;
-- DROP INDEX IF EXISTS idx_delivery_zones_store_active;
-- DROP TABLE IF EXISTS public.delivery_zones;
