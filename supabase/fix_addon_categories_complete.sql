-- ==========================================
-- CORREÇÃO COMPLETA DA TABELA addon_categories
-- ==========================================
-- Execute este arquivo no Supabase SQL Editor
-- Este SQL corrige e adiciona todas as colunas necessárias

-- Step 1: Remove constraints antigas se existirem
ALTER TABLE addon_categories DROP CONSTRAINT IF EXISTS min_items_non_negative;
ALTER TABLE addon_categories DROP CONSTRAINT IF EXISTS max_items_valid;

-- Step 2: Adiciona as colunas se não existirem
DO $$ 
BEGIN
    -- Adiciona min_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'addon_categories' 
        AND column_name = 'min_items'
    ) THEN
        ALTER TABLE addon_categories ADD COLUMN min_items INTEGER DEFAULT 0;
    END IF;

    -- Adiciona max_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'addon_categories' 
        AND column_name = 'max_items'
    ) THEN
        ALTER TABLE addon_categories ADD COLUMN max_items INTEGER DEFAULT NULL;
    END IF;

    -- Adiciona is_exclusive
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'addon_categories' 
        AND column_name = 'is_exclusive'
    ) THEN
        ALTER TABLE addon_categories ADD COLUMN is_exclusive BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 3: Atualiza valores NULL em registros existentes
UPDATE addon_categories 
SET 
    min_items = COALESCE(min_items, 0),
    max_items = max_items,
    is_exclusive = COALESCE(is_exclusive, false)
WHERE min_items IS NULL OR is_exclusive IS NULL;

-- Step 4: Define NOT NULL para min_items e is_exclusive
ALTER TABLE addon_categories 
    ALTER COLUMN min_items SET DEFAULT 0,
    ALTER COLUMN min_items SET NOT NULL;

ALTER TABLE addon_categories 
    ALTER COLUMN is_exclusive SET DEFAULT false,
    ALTER COLUMN is_exclusive SET NOT NULL;

-- Step 5: Adiciona as constraints
ALTER TABLE addon_categories
ADD CONSTRAINT min_items_non_negative CHECK (min_items >= 0);

ALTER TABLE addon_categories
ADD CONSTRAINT max_items_valid CHECK (
    max_items IS NULL OR 
    (is_exclusive = false AND max_items >= min_items) OR
    (is_exclusive = true AND max_items = 1)
);

-- Step 6: Adiciona comentários nas colunas
COMMENT ON COLUMN addon_categories.min_items IS 'Mínimo de itens que devem ser selecionados desta categoria (0 = opcional)';
COMMENT ON COLUMN addon_categories.max_items IS 'Máximo de itens que podem ser selecionados desta categoria (NULL = ilimitado)';
COMMENT ON COLUMN addon_categories.is_exclusive IS 'Quando true, apenas um adicional pode ser selecionado desta categoria (comportamento de radio button)';

-- Step 7: Verificação final
DO $$ 
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'addon_categories' 
    AND column_name IN ('min_items', 'max_items', 'is_exclusive');
    
    IF col_count = 3 THEN
        RAISE NOTICE '✅ Todas as colunas foram adicionadas com sucesso!';
    ELSE
        RAISE EXCEPTION '❌ Erro: Apenas % de 3 colunas foram adicionadas', col_count;
    END IF;
END $$;
