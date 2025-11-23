-- Execute este SQL no SQL Editor do Supabase para corrigir as imagens
-- https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new

-- Atualizar o bucket para ser público
UPDATE storage.buckets
SET public = true
WHERE id = 'product-images';

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Public Access to Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- Criar política para acesso público de leitura
CREATE POLICY "Public Access to Product Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Criar política para usuários autenticados fazerem upload
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Criar política para usuários autenticados atualizarem
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Criar política para usuários autenticados deletarem
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
