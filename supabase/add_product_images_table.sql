-- Criar tabela para múltiplas imagens de produtos
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(display_order);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view product images"
  ON public.product_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
      AND (p.is_available = true OR 
           EXISTS (SELECT 1 FROM public.stores WHERE id = p.store_id AND owner_id = auth.uid()) OR
           EXISTS (SELECT 1 FROM public.store_employees 
                   WHERE store_id = p.store_id 
                   AND user_id = auth.uid() 
                   AND is_active = true) OR
           has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Store owners and employees can manage product images"
  ON public.product_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_images.product_id
      AND (s.owner_id = auth.uid() OR
           EXISTS (SELECT 1 FROM public.store_employees 
                   WHERE store_id = s.id 
                   AND user_id = auth.uid() 
                   AND is_active = true
                   AND (permissions->'products'->>'update')::boolean = true) OR
           has_role(auth.uid(), 'admin'))
    )
  );

-- Migrar imagens existentes da coluna image_url para a nova tabela
INSERT INTO public.product_images (product_id, image_url, display_order, is_primary)
SELECT id, image_url, 0, true
FROM public.products
WHERE image_url IS NOT NULL AND image_url != '';

-- Comentários
COMMENT ON TABLE public.product_images IS 'Armazena múltiplas imagens para cada produto';
COMMENT ON COLUMN public.product_images.is_primary IS 'Indica se esta é a imagem principal do produto';
COMMENT ON COLUMN public.product_images.display_order IS 'Ordem de exibição das imagens (0 = primeira)';
