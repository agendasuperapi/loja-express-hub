-- ============================================================================
-- MIGRATION: Color-Size Variant Matrix System
-- ============================================================================
-- Execute este SQL no Supabase SQL Editor
-- Link: https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new
-- ============================================================================

-- Create color_size_variants table
CREATE TABLE IF NOT EXISTS public.color_size_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES public.product_colors(id) ON DELETE CASCADE,
  size_id uuid NOT NULL REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT true,
  stock_quantity integer DEFAULT NULL,
  price_adjustment numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Unique constraint: each combination must be unique per product
  UNIQUE(product_id, color_id, size_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_color_size_variants_product 
ON public.color_size_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_color_size_variants_color 
ON public.color_size_variants(color_id);

CREATE INDEX IF NOT EXISTS idx_color_size_variants_size 
ON public.color_size_variants(size_id);

CREATE INDEX IF NOT EXISTS idx_color_size_variants_available 
ON public.color_size_variants(product_id, is_available);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_color_size_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_color_size_variants_updated_at
  BEFORE UPDATE ON public.color_size_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_color_size_variants_updated_at();

-- RLS Policies
ALTER TABLE public.color_size_variants ENABLE ROW LEVEL SECURITY;

-- Anyone can view available variants (customers browsing)
CREATE POLICY "Anyone can view available variants"
  ON public.color_size_variants
  FOR SELECT
  USING (
    is_available = true 
    OR EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = color_size_variants.product_id
        AND (
          s.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM store_employees
            WHERE store_employees.store_id = s.id
              AND store_employees.user_id = auth.uid()
              AND store_employees.is_active = true
              AND ((store_employees.permissions->'products'->>'view')::boolean = true)
          )
          OR has_role(auth.uid(), 'admin')
        )
    )
  );

-- Store owners and employees can manage variants
CREATE POLICY "Store owners and employees can manage variants"
  ON public.color_size_variants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = color_size_variants.product_id
        AND (
          s.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM store_employees
            WHERE store_employees.store_id = s.id
              AND store_employees.user_id = auth.uid()
              AND store_employees.is_active = true
              AND ((store_employees.permissions->'products'->>'update')::boolean = true)
          )
          OR has_role(auth.uid(), 'admin')
        )
    )
  );

-- ============================================================================
-- Order Item Variants - Historical Data
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  color_id uuid REFERENCES public.product_colors(id) ON DELETE SET NULL,
  size_id uuid REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  color_name text,
  size_name text,
  variant_price_adjustment numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_item_variants_order_item 
ON public.order_item_variants(order_item_id);

-- RLS for order_item_variants
ALTER TABLE public.order_item_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert variants when creating orders"
  ON public.order_item_variants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_variants.order_item_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can view variants of their orders"
  ON public.order_item_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_variants.order_item_id
        AND (
          o.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM stores s
            WHERE s.id = o.store_id
              AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
          )
        )
    )
  );

-- ============================================================================
-- Table Comments
-- ============================================================================

COMMENT ON TABLE public.color_size_variants IS 
  'Matrix linking colors and sizes for products with availability control';

COMMENT ON COLUMN public.color_size_variants.stock_quantity IS 
  'Optional stock control per variant combination';

COMMENT ON COLUMN public.color_size_variants.price_adjustment IS 
  'Additional price adjustment for this specific combination (on top of individual color/size adjustments)';

COMMENT ON TABLE public.order_item_variants IS 
  'Historical record of color-size variants selected in orders';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Agora você pode:
-- 1. Gerenciar cores no dashboard de produtos
-- 2. Gerenciar tamanhos no dashboard de produtos
-- 3. Acessar a "Matriz de Variantes" para controlar disponibilidade
-- 4. As combinações serão criadas automaticamente ao adicionar cores/tamanhos
-- ============================================================================
