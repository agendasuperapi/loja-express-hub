-- Remover TODAS as políticas do bucket product-images para recriar
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname LIKE '%product%image%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Criar política pública de leitura total
CREATE POLICY "Public read for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Política temporária para permitir upload em temp (será removida depois)
CREATE POLICY "Temp upload for product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = 'temp'
);

-- Política para store owners fazerem upload de produtos finais
CREATE POLICY "Store owners upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] != 'temp'
);

-- Política para atualizar imagens
CREATE POLICY "Store owners update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Política para deletar imagens
CREATE POLICY "Store owners delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');