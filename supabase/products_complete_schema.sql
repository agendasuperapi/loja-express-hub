-- ==========================================
-- SCHEMA COMPLETO: TABELA PRODUCTS
-- ==========================================
-- Este arquivo contém a estrutura completa da tabela products
-- incluindo a funcionalidade de produtos em destaque (is_featured)

-- Tabela: products
-- Descrição: Armazena todos os produtos das lojas
CREATE TABLE IF NOT EXISTS public.products (
  -- Identificadores
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  short_id text UNIQUE,
  external_code text,
  
  -- Informações básicas
  name text NOT NULL,
  description text,
  category text NOT NULL,
  
  -- Preços e estoque
  price numeric NOT NULL,
  promotional_price numeric,
  stock_quantity integer DEFAULT 0,
  
  -- Status e disponibilidade
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  
  -- Imagem
  image_url text,
  
  -- Configurações de pizza/sabores
  is_pizza boolean DEFAULT false,
  max_flavors integer DEFAULT 1,
  
  -- Ordenação
  display_order integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- ÍNDICES
-- ==========================================

-- Índice para busca por loja
CREATE INDEX IF NOT EXISTS idx_products_store_id 
ON public.products(store_id);

-- Índice para produtos disponíveis
CREATE INDEX IF NOT EXISTS idx_products_is_available 
ON public.products(store_id, is_available) 
WHERE is_available = true;

-- Índice para produtos em destaque (NOVO)
CREATE INDEX IF NOT EXISTS idx_products_is_featured 
ON public.products(store_id, is_featured) 
WHERE is_featured = true;

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS idx_products_display_order 
ON public.products(store_id, display_order);

-- Índice para código externo único por loja
CREATE UNIQUE INDEX IF NOT EXISTS products_store_external_code_unique 
ON public.products(store_id, external_code) 
WHERE external_code IS NOT NULL AND external_code != '';

-- Índice para categoria
CREATE INDEX IF NOT EXISTS idx_products_category 
ON public.products(store_id, category);

-- ==========================================
-- CONSTRAINTS
-- ==========================================

-- Garantir que o preço seja positivo
ALTER TABLE public.products 
ADD CONSTRAINT products_price_positive 
CHECK (price >= 0);

-- Garantir que preço promocional seja menor que preço normal
ALTER TABLE public.products 
ADD CONSTRAINT products_promotional_price_valid 
CHECK (promotional_price IS NULL OR promotional_price <= price);

-- Garantir que estoque não seja negativo
ALTER TABLE public.products 
ADD CONSTRAINT products_stock_non_negative 
CHECK (stock_quantity >= 0);

-- Garantir que max_flavors seja positivo
ALTER TABLE public.products 
ADD CONSTRAINT products_max_flavors_positive 
CHECK (max_flavors > 0);

-- ==========================================
-- COMENTÁRIOS
-- ==========================================

COMMENT ON TABLE public.products IS 'Tabela de produtos das lojas';

COMMENT ON COLUMN public.products.id IS 'Identificador único do produto';
COMMENT ON COLUMN public.products.store_id IS 'ID da loja proprietária do produto';
COMMENT ON COLUMN public.products.short_id IS 'ID curto gerado automaticamente para URLs amigáveis';
COMMENT ON COLUMN public.products.external_code IS 'Código externo/SKU do produto (único por loja)';
COMMENT ON COLUMN public.products.name IS 'Nome do produto';
COMMENT ON COLUMN public.products.description IS 'Descrição detalhada do produto';
COMMENT ON COLUMN public.products.category IS 'Categoria do produto';
COMMENT ON COLUMN public.products.price IS 'Preço normal do produto';
COMMENT ON COLUMN public.products.promotional_price IS 'Preço promocional (se houver)';
COMMENT ON COLUMN public.products.stock_quantity IS 'Quantidade em estoque';
COMMENT ON COLUMN public.products.is_available IS 'Indica se o produto está disponível para venda';
COMMENT ON COLUMN public.products.is_featured IS 'Indica se o produto aparece no carrossel de destaques da loja';
COMMENT ON COLUMN public.products.image_url IS 'URL da imagem do produto';
COMMENT ON COLUMN public.products.is_pizza IS 'Indica se o produto é uma pizza (permite múltiplos sabores)';
COMMENT ON COLUMN public.products.max_flavors IS 'Número máximo de sabores permitidos (para pizzas)';
COMMENT ON COLUMN public.products.display_order IS 'Ordem de exibição do produto (menor aparece primeiro)';
COMMENT ON COLUMN public.products.created_at IS 'Data de criação do produto';
COMMENT ON COLUMN public.products.updated_at IS 'Data da última atualização';

-- ==========================================
-- TRIGGER: updated_at
-- ==========================================

-- Trigger para atualizar automaticamente o campo updated_at
CREATE OR REPLACE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- TRIGGER: short_id
-- ==========================================

-- Trigger para gerar short_id automaticamente
CREATE OR REPLACE TRIGGER set_products_short_id
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_short_id();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer pessoa pode ver produtos disponíveis
CREATE POLICY "Anyone can view available products (public)" 
ON public.products
FOR SELECT
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
    AND ((store_employees.permissions->'products'->>'view')::boolean = true)
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Policy: Donos de loja e funcionários podem gerenciar produtos
CREATE POLICY "Store owners and employees can manage products" 
ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = products.store_id
    AND stores.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.store_employees
    WHERE store_employees.store_id = products.store_id
    AND store_employees.user_id = auth.uid()
    AND store_employees.is_active = true
    AND (
      ((store_employees.permissions->'products'->>'create')::boolean = true)
      OR ((store_employees.permissions->'products'->>'update')::boolean = true)
      OR ((store_employees.permissions->'products'->>'delete')::boolean = true)
    )
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- ==========================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ==========================================

-- Para testar, descomente as linhas abaixo e substitua os IDs

/*
-- Inserir produto de exemplo em destaque
INSERT INTO public.products (
  store_id,
  name,
  description,
  category,
  price,
  promotional_price,
  is_available,
  is_featured,
  image_url
) VALUES (
  'UUID_DA_SUA_LOJA',
  'Pizza Margherita',
  'Pizza tradicional com molho de tomate, mussarela e manjericão fresco',
  'Pizzas',
  45.90,
  39.90,
  true,
  true,
  'https://example.com/pizza-margherita.jpg'
);

-- Inserir produto normal (não em destaque)
INSERT INTO public.products (
  store_id,
  name,
  description,
  category,
  price,
  is_available,
  is_featured
) VALUES (
  'UUID_DA_SUA_LOJA',
  'Refrigerante Lata',
  'Refrigerante 350ml gelado',
  'Bebidas',
  5.00,
  true,
  false
);
*/

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================

-- Consulta para verificar produtos em destaque de uma loja
/*
SELECT 
  id,
  name,
  price,
  promotional_price,
  is_featured,
  is_available,
  display_order,
  created_at
FROM public.products
WHERE store_id = 'UUID_DA_SUA_LOJA'
  AND is_featured = true
  AND is_available = true
ORDER BY display_order ASC, created_at DESC
LIMIT 10;
*/
