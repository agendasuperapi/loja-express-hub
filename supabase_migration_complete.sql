-- =====================================================
-- MIGRAÇÃO COMPLETA PARA SUPABASE
-- =====================================================
-- Execute este SQL no seu projeto Supabase
-- URL: https://mgpzowiahnwcmcaelogf.supabase.co
-- =====================================================

-- 1. CRIAR ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('customer', 'store_owner', 'admin');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled');
CREATE TYPE public.store_status AS ENUM ('pending_approval', 'active', 'inactive', 'rejected');

-- =====================================================
-- 2. CRIAR TABELAS PRIMEIRO
-- =====================================================

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  street text,
  street_number text,
  neighborhood text,
  complement text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de roles de usuários
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de lojas
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  banner_url text,
  category text NOT NULL,
  address text,
  phone text,
  email text,
  status store_status NOT NULL DEFAULT 'pending_approval',
  rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  avg_delivery_time integer DEFAULT 30,
  is_open boolean DEFAULT true,
  operating_hours jsonb DEFAULT '{"monday": {"open": "08:00", "close": "18:00", "is_closed": false}, "tuesday": {"open": "08:00", "close": "18:00", "is_closed": false}, "wednesday": {"open": "08:00", "close": "18:00", "is_closed": false}, "thursday": {"open": "08:00", "close": "18:00", "is_closed": false}, "friday": {"open": "08:00", "close": "18:00", "is_closed": false}, "saturday": {"open": "08:00", "close": "14:00", "is_closed": false}, "sunday": {"open": "08:00", "close": "12:00", "is_closed": true}}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de categorias de produtos
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  category text NOT NULL,
  price numeric NOT NULL,
  promotional_price numeric,
  stock_quantity integer DEFAULT 0,
  is_available boolean DEFAULT true,
  is_pizza boolean DEFAULT false,
  max_flavors integer DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de sabores de produtos (para pizzas)
CREATE TABLE public.product_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de adicionais de produtos
CREATE TABLE public.product_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_type text NOT NULL DEFAULT 'delivery',
  delivery_street text DEFAULT '',
  delivery_number text DEFAULT '',
  delivery_neighborhood text DEFAULT '',
  delivery_complement text,
  payment_method text NOT NULL DEFAULT 'pix',
  change_amount numeric,
  subtotal numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de itens do pedido
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  observation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de sabores dos itens do pedido
CREATE TABLE public.order_item_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  flavor_name text NOT NULL,
  flavor_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de adicionais dos itens do pedido
CREATE TABLE public.order_item_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  addon_name text NOT NULL,
  addon_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de favoritos
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Tabela de avaliações
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. CRIAR FUNÇÕES (após tabelas existirem)
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Função para verificar roles (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para adicionar admin por email
CREATE OR REPLACE FUNCTION public.add_admin_role_by_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Função para criar perfil e role ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. CRIAR TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em stores
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em product_flavors
CREATE TRIGGER update_product_flavors_updated_at
  BEFORE UPDATE ON public.product_flavors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em product_addons
CREATE TRIGGER update_product_addons_updated_at
  BEFORE UPDATE ON public.product_addons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil quando usuário se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. HABILITAR RLS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CRIAR POLÍTICAS RLS
-- =====================================================

-- Políticas para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register as store owner"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'store_owner');

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para stores
CREATE POLICY "Anyone can view active stores"
  ON public.stores FOR SELECT
  USING (status = 'active' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners can insert their stores"
  ON public.stores FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'store_owner'));

CREATE POLICY "Store owners can update their stores"
  ON public.stores FOR UPDATE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete stores"
  ON public.stores FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para product_categories
CREATE POLICY "Anyone can view categories"
  ON public.product_categories FOR SELECT
  USING (true);

CREATE POLICY "Store owners can manage their categories"
  ON public.product_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = product_categories.store_id
    AND stores.owner_id = auth.uid()
  ));

-- Políticas para products
CREATE POLICY "Anyone can view available products"
  ON public.products FOR SELECT
  USING (
    is_available = true
    OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can manage their products"
  ON public.products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Políticas para product_flavors
CREATE POLICY "Anyone can view available flavors"
  ON public.product_flavors FOR SELECT
  USING (
    is_available = true
    OR EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_flavors.product_id AND s.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can manage their product flavors"
  ON public.product_flavors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_flavors.product_id AND s.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Políticas para product_addons
CREATE POLICY "Anyone can view available addons"
  ON public.product_addons FOR SELECT
  USING (
    is_available = true
    OR EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_addons.product_id AND s.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can manage their product addons"
  ON public.product_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_addons.product_id AND s.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Políticas para orders
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can update their store orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Políticas para order_items
CREATE POLICY "Customers can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.customer_id = auth.uid()
  ));

CREATE POLICY "Users can view order items of their orders"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.customer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  ));

-- Políticas para order_item_flavors
CREATE POLICY "Customers can insert flavors when creating order items"
  ON public.order_item_flavors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_flavors.order_item_id
    AND o.customer_id = auth.uid()
  ));

CREATE POLICY "Users can view flavors of their order items"
  ON public.order_item_flavors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_flavors.order_item_id
    AND (
      o.customer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = o.store_id AND s.owner_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  ));

-- Políticas para order_item_addons
CREATE POLICY "Customers can insert addons when creating order items"
  ON public.order_item_addons FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND o.customer_id = auth.uid()
  ));

CREATE POLICY "Users can view addons of their order items"
  ON public.order_item_addons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND (
      o.customer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = o.store_id AND s.owner_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  ));

-- Políticas para favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id);

-- Políticas para reviews
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Customers can create reviews for their orders"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (SELECT 1 FROM public.orders WHERE orders.id = reviews.order_id AND orders.customer_id = auth.uid())
  );

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 7. CONFIGURAR STORAGE BUCKETS
-- =====================================================
-- Execute estes comandos no Supabase Dashboard ou via SQL:

-- Criar buckets (se não existirem)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('store-logos', 'store-logos', true),
  ('store-banners', 'store-banners', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para store-logos
CREATE POLICY "Anyone can view store logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-logos');

CREATE POLICY "Store owners can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Store owners can update their logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Store owners can delete their logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

-- Políticas para store-banners
CREATE POLICY "Anyone can view store banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-banners');

CREATE POLICY "Store owners can upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Store owners can update their banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Store owners can delete their banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);

-- Políticas para product-images
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Store owners can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Store owners can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Store owners can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- =====================================================
-- 8. CONFIGURAR AUTENTICAÇÃO
-- =====================================================
-- No Supabase Dashboard:
-- 1. Vá em Authentication > Settings
-- 2. Habilite "Enable email confirmations" = OFF (para desenvolvimento)
-- 3. Configure os Email Templates conforme necessário

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
-- Após executar este SQL:
-- 1. Configure as variáveis de ambiente no seu projeto
-- 2. Gere os types do Supabase (se usar TypeScript)
-- 3. Migre os dados existentes (se houver)
-- =====================================================
