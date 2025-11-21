-- Migration: Add external_code to products table
-- Description: Adds a unique external/custom code field for products

-- Add external_code column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'external_code'
  ) THEN
    ALTER TABLE public.products ADD COLUMN external_code TEXT;
    RAISE NOTICE 'Column external_code added to products table';
  ELSE
    RAISE NOTICE 'Column external_code already exists in products table';
  END IF;
END $$;

-- Drop old store-level unique constraint if it exists
DROP INDEX IF EXISTS public.products_store_external_code_unique;

-- Create global unique constraint for external_code
-- This ensures each external_code is unique across ALL products
DROP INDEX IF EXISTS public.products_external_code_unique;
CREATE UNIQUE INDEX products_external_code_unique 
ON public.products (external_code) 
WHERE external_code IS NOT NULL AND external_code != '';

-- Add helpful comment
COMMENT ON COLUMN public.products.external_code IS 'External/custom product code - unique globally across all products. Used for inventory control and external system integration.';

-- Verify the changes
DO $$ 
DECLARE
  col_exists BOOLEAN;
  idx_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'external_code'
  ) INTO col_exists;
  
  -- Check if index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND indexname = 'products_external_code_unique'
  ) INTO idx_exists;
  
  IF col_exists AND idx_exists THEN
    RAISE NOTICE '✓ Migration completed successfully';
    RAISE NOTICE '✓ Column external_code is available';
    RAISE NOTICE '✓ Unique index is active';
  ELSE
    RAISE WARNING '⚠ Migration may have issues. Column exists: %, Index exists: %', col_exists, idx_exists;
  END IF;
END $$;
