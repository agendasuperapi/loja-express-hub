-- ==========================================
-- MIGRAÇÃO SEGURA: PRODUTOS EM DESTAQUE
-- ==========================================
-- Este script adiciona a funcionalidade de produtos em destaque
-- de forma segura, sem causar erros se executado múltiplas vezes

-- ==========================================
-- STEP 1: Adicionar coluna is_featured
-- ==========================================

-- Adicionar coluna is_featured se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN is_featured BOOLEAN DEFAULT false;
    
    RAISE NOTICE '✅ Coluna is_featured adicionada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Coluna is_featured já existe';
  END IF;
END $$;

-- ==========================================
-- STEP 2: Adicionar comentário
-- ==========================================

COMMENT ON COLUMN public.products.is_featured IS 'Indica se o produto aparece no carrossel de destaques da loja';

-- ==========================================
-- STEP 3: Criar índice para produtos em destaque
-- ==========================================

DO $$ 
BEGIN
  -- Remover índice antigo se existir com nome diferente
  DROP INDEX IF EXISTS public.idx_products_featured;
  
  -- Criar novo índice
  CREATE INDEX IF NOT EXISTS idx_products_is_featured 
  ON public.products(store_id, is_featured) 
  WHERE is_featured = true;
  
  RAISE NOTICE '✅ Índice idx_products_is_featured criado/atualizado';
END $$;

-- ==========================================
-- STEP 4: Atualizar produtos existentes
-- ==========================================

DO $$ 
BEGIN
  -- Garantir que produtos existentes tenham is_featured = false
  UPDATE public.products 
  SET is_featured = false 
  WHERE is_featured IS NULL;
  
  RAISE NOTICE '✅ Produtos existentes atualizados com is_featured = false';
END $$;

-- ==========================================
-- STEP 5: Verificação final
-- ==========================================

DO $$ 
DECLARE
  coluna_existe BOOLEAN;
  indice_existe BOOLEAN;
  total_produtos INTEGER;
  produtos_destaque INTEGER;
BEGIN
  -- Verificar coluna
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_featured'
  ) INTO coluna_existe;
  
  -- Verificar índice
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'products' 
    AND indexname = 'idx_products_is_featured'
  ) INTO indice_existe;
  
  -- Contar produtos
  SELECT COUNT(*) INTO total_produtos FROM public.products;
  SELECT COUNT(*) INTO produtos_destaque FROM public.products WHERE is_featured = true;
  
  -- Relatório
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '       RELATÓRIO DA MIGRAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF coluna_existe THEN
    RAISE NOTICE '✅ Coluna is_featured: OK';
  ELSE
    RAISE NOTICE '❌ Coluna is_featured: ERRO';
  END IF;
  
  IF indice_existe THEN
    RAISE NOTICE '✅ Índice idx_products_is_featured: OK';
  ELSE
    RAISE NOTICE '❌ Índice idx_products_is_featured: ERRO';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Total de produtos: %', total_produtos;
  RAISE NOTICE 'Produtos em destaque: %', produtos_destaque;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '     MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '========================================';
  
  -- Se houver algum erro, lançar exceção
  IF NOT coluna_existe OR NOT indice_existe THEN
    RAISE EXCEPTION 'Migração falhou - verifique os erros acima';
  END IF;
END $$;

-- ==========================================
-- INSTRUÇÕES DE USO
-- ==========================================

/*
COMO EXECUTAR:

1. Acesse o Supabase SQL Editor:
   https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new

2. Cole todo o conteúdo deste arquivo

3. Clique em "Run" para executar

4. Verifique o relatório de sucesso no final

NOTA: Este script pode ser executado múltiplas vezes sem causar erros.
*/

-- ==========================================
-- CONSULTAS ÚTEIS
-- ==========================================

-- Ver todos os produtos em destaque
/*
SELECT 
  p.id,
  p.name,
  p.category,
  p.price,
  p.promotional_price,
  p.is_featured,
  p.is_available,
  p.display_order,
  s.name as store_name
FROM public.products p
JOIN public.stores s ON s.id = p.store_id
WHERE p.is_featured = true
ORDER BY p.store_id, p.display_order, p.created_at DESC;
*/

-- Marcar produtos específicos como destaque (exemplo)
/*
UPDATE public.products
SET is_featured = true
WHERE id IN (
  'uuid-do-produto-1',
  'uuid-do-produto-2',
  'uuid-do-produto-3'
);
*/

-- Remover destaque de todos os produtos de uma loja
/*
UPDATE public.products
SET is_featured = false
WHERE store_id = 'uuid-da-loja';
*/

-- Contar produtos em destaque por loja
/*
SELECT 
  s.name as loja,
  COUNT(*) as produtos_destaque
FROM public.products p
JOIN public.stores s ON s.id = p.store_id
WHERE p.is_featured = true
GROUP BY s.id, s.name
ORDER BY produtos_destaque DESC;
*/
