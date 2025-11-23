-- Garantir que o bucket product-images seja público
UPDATE storage.buckets
SET public = true
WHERE id = 'product-images';

-- Criar política para permitir leitura pública das imagens
DROP POLICY IF EXISTS "Public Access to Product Images" ON storage.objects;

CREATE POLICY "Public Access to Product Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Política para permitir que usuários autenticados façam upload
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Política para permitir que usuários autenticados atualizem suas imagens
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Política para permitir que usuários autenticados deletem imagens
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
