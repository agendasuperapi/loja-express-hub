-- ==========================================
-- EXECUTE THIS FILE IN SUPABASE SQL EDITOR
-- ==========================================
-- This migration adds min_items, max_items, and is_exclusive columns
-- to the addon_categories table to enable quantity limits and exclusive selection

-- Step 1: Add min_items and max_items columns
ALTER TABLE addon_categories
ADD COLUMN IF NOT EXISTS min_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_items INTEGER DEFAULT NULL;

-- Step 2: Add is_exclusive column
ALTER TABLE addon_categories
ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

-- Step 3: Add constraints
-- Drop existing constraint if it exists
ALTER TABLE addon_categories
DROP CONSTRAINT IF EXISTS min_items_non_negative;

ALTER TABLE addon_categories
DROP CONSTRAINT IF EXISTS max_items_valid;

-- Add min_items constraint
ALTER TABLE addon_categories
ADD CONSTRAINT min_items_non_negative CHECK (min_items >= 0);

-- Add max_items constraint (supports exclusive categories)
ALTER TABLE addon_categories
ADD CONSTRAINT max_items_valid CHECK (
  max_items IS NULL OR 
  (is_exclusive = false AND max_items >= min_items) OR
  (is_exclusive = true AND max_items = 1)
);

-- Step 4: Add column comments
COMMENT ON COLUMN addon_categories.min_items IS 'Minimum number of items that must be selected from this category (0 = optional)';
COMMENT ON COLUMN addon_categories.max_items IS 'Maximum number of items that can be selected from this category (NULL = unlimited)';
COMMENT ON COLUMN addon_categories.is_exclusive IS 'When true, only one addon can be selected from this category (radio button behavior)';

-- Step 5: Update existing categories to have default values
UPDATE addon_categories 
SET 
  min_items = COALESCE(min_items, 0),
  is_exclusive = COALESCE(is_exclusive, false)
WHERE min_items IS NULL OR is_exclusive IS NULL;
