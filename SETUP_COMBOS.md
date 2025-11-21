# Setup de Combos Promocionais

Para ativar o sistema de combos, execute o SQL abaixo no Supabase SQL Editor:

```sql
-- Create product_combos table
CREATE TABLE IF NOT EXISTS public.product_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  combo_price NUMERIC NOT NULL CHECK (combo_price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create combo_items table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.product_combos(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(combo_id, product_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_combos_store_id ON public.product_combos(store_id);
CREATE INDEX IF NOT EXISTS idx_product_combos_is_available ON public.product_combos(is_available);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo_id ON public.combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_product_id ON public.combo_items(product_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_product_combos_updated_at ON public.product_combos;
CREATE TRIGGER update_product_combos_updated_at
  BEFORE UPDATE ON public.product_combos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for product_combos
ALTER TABLE public.product_combos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available combos" ON public.product_combos;
CREATE POLICY "Anyone can view available combos"
  ON public.product_combos
  FOR SELECT
  USING (
    is_available = true 
    OR EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_combos.store_id
      AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_employees
      WHERE store_employees.store_id = product_combos.store_id
      AND store_employees.user_id = auth.uid()
      AND store_employees.is_active = true
      AND ((store_employees.permissions->'products'->>'view')::boolean = true)
    )
    OR has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Store owners and employees can manage combos" ON public.product_combos;
CREATE POLICY "Store owners and employees can manage combos"
  ON public.product_combos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_combos.store_id
      AND stores.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_employees
      WHERE store_employees.store_id = product_combos.store_id
      AND store_employees.user_id = auth.uid()
      AND store_employees.is_active = true
      AND (
        ((store_employees.permissions->'products'->>'create')::boolean = true)
        OR ((store_employees.permissions->'products'->>'update')::boolean = true)
        OR ((store_employees.permissions->'products'->>'delete')::boolean = true)
      )
    )
    OR has_role(auth.uid(), 'admin')
  );

-- RLS Policies for combo_items
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view combo items" ON public.combo_items;
CREATE POLICY "Anyone can view combo items"
  ON public.combo_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_combos pc
      WHERE pc.id = combo_items.combo_id
      AND (
        pc.is_available = true
        OR EXISTS (
          SELECT 1 FROM public.stores
          WHERE stores.id = pc.store_id
          AND stores.owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.store_employees
          WHERE store_employees.store_id = pc.store_id
          AND store_employees.user_id = auth.uid()
          AND store_employees.is_active = true
        )
        OR has_role(auth.uid(), 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Store owners and employees can manage combo items" ON public.combo_items;
CREATE POLICY "Store owners and employees can manage combo items"
  ON public.combo_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.product_combos pc
      INNER JOIN public.stores s ON s.id = pc.store_id
      WHERE pc.id = combo_items.combo_id
      AND (
        s.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.store_employees
          WHERE store_employees.store_id = s.id
          AND store_employees.user_id = auth.uid()
          AND store_employees.is_active = true
          AND (
            ((store_employees.permissions->'products'->>'create')::boolean = true)
            OR ((store_employees.permissions->'products'->>'update')::boolean = true)
            OR ((store_employees.permissions->'products'->>'delete')::boolean = true)
          )
        )
        OR has_role(auth.uid(), 'admin')
      )
    )
  );
```

## Como usar:

1. Acesse o Supabase SQL Editor: https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new
2. Cole o SQL acima
3. Execute o comando
4. A aba "Combos" aparecerá automaticamente no dashboard
