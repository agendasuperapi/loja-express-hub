-- Fix RLS: allow anonymous users to view available products and related data
-- This keeps management restricted to authenticated owners/employees/admins.

BEGIN;

-- Products: allow public SELECT for available products
DROP POLICY IF EXISTS "Anyone can view available products" ON public.products;
CREATE POLICY "Anyone can view available products (public)"
ON public.products
FOR SELECT
TO public
USING (
  is_available = true
  OR EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = products.store_id 
    AND stores.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.store_employees 
    WHERE store_employees.store_id = products.store_id 
    AND store_employees.user_id = auth.uid()
    AND store_employees.is_active = true
    AND (store_employees.permissions->'products'->>'view')::boolean = true
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Product Addons: allow public SELECT for available addons
DROP POLICY IF EXISTS "Anyone can view available addons" ON public.product_addons;
CREATE POLICY "Anyone can view available addons (public)"
ON public.product_addons
FOR SELECT
TO public
USING (
  is_available = true
  OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_addons.product_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'products'->>'view')::boolean = true
      )
    )
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Product Flavors: allow public SELECT for available flavors
DROP POLICY IF EXISTS "Anyone can view available flavors" ON public.product_flavors;
CREATE POLICY "Anyone can view available flavors (public)"
ON public.product_flavors
FOR SELECT
TO public
USING (
  is_available = true
  OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_flavors.product_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'products'->>'view')::boolean = true
      )
    )
  )
  OR public.has_role(auth.uid(), 'admin')
);

COMMIT;
