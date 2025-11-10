
-- Migration: 20251110120719

-- Migration: 20251013070048
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('customer', 'store_owner', 'admin');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled');

-- Create enum for store status
CREATE TYPE public.store_status AS ENUM ('active', 'inactive', 'pending_approval');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  category TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  status store_status NOT NULL DEFAULT 'pending_approval',
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  avg_delivery_time INTEGER DEFAULT 30,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  promotional_price DECIMAL(10,2),
  category TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  delivery_address TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, customer_id)
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Create function to automatically create profile and assign customer role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stores
CREATE POLICY "Anyone can view active stores" ON public.stores FOR SELECT USING (status = 'active' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Store owners can insert their stores" ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'store_owner'));
CREATE POLICY "Store owners can update their stores" ON public.stores FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete stores" ON public.stores FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Anyone can view available products" ON public.products FOR SELECT USING (is_available = true OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Store owners can manage their products" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Store owners can update their store orders" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for order_items
CREATE POLICY "Users can view order items of their orders" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Customers can insert order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()));

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers can create reviews for their orders" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id AND EXISTS (SELECT 1 FROM public.orders WHERE orders.id = reviews.order_id AND orders.customer_id = auth.uid()));
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for favorites
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX idx_stores_status ON public.stores(status);
CREATE INDEX idx_stores_category ON public.stores(category);
CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_store_id ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_reviews_store_id ON public.reviews(store_id);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_store_id ON public.favorites(store_id);

-- Migration: 20251013095630
-- Allow users to insert store_owner role for themselves
CREATE POLICY "Users can register as store owner"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'store_owner'
);

-- Migration: 20251013101013
-- Add admin role to specific user
-- First, we need to find the user by email and add admin role
-- This will work after the user signs up with this email

-- Create a function to add admin role to user by email
CREATE OR REPLACE FUNCTION add_admin_role_by_email(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  -- If user exists, add admin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Add admin role to the specified email
SELECT add_admin_role_by_email('walisonflix10@gmail.com');

-- Migration: 20251013103733
-- Create storage buckets for store assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('store-logos', 'store-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('store-banners', 'store-banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- RLS policies for store-logos bucket
CREATE POLICY "Store owners can upload their store logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-logos' 
  AND auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Store owners can update their store logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-logos' 
  AND auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Store owners can delete their store logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-logos' 
  AND auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Anyone can view store logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'store-logos');

-- RLS policies for store-banners bucket
CREATE POLICY "Store owners can upload their store banner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-banners' 
  AND auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Store owners can update their store banner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-banners' 
  AND auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Store owners can delete their store banner"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-banners' 
  AND auth.uid() IN (
    SELECT owner_id FROM public.stores 
    WHERE id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Anyone can view store banners"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'store-banners');

-- RLS policies for product-images bucket
CREATE POLICY "Store owners can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IN (
    SELECT stores.owner_id FROM public.stores 
    JOIN public.products ON products.store_id = stores.id
    WHERE products.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Store owners can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IN (
    SELECT stores.owner_id FROM public.stores 
    JOIN public.products ON products.store_id = stores.id
    WHERE products.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Store owners can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IN (
    SELECT stores.owner_id FROM public.stores 
    JOIN public.products ON products.store_id = stores.id
    WHERE products.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Migration: 20251014020906
-- Add address column to profiles table
ALTER TABLE public.profiles
ADD COLUMN address TEXT;

-- Update the trigger to include address when creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, address)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address'
  );
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$function$;

-- Migration: 20251014021255
-- Add new address fields to profiles table
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS address;

ALTER TABLE public.profiles
ADD COLUMN street TEXT,
ADD COLUMN street_number TEXT,
ADD COLUMN neighborhood TEXT,
ADD COLUMN complement TEXT;

-- Add new address fields to orders table
ALTER TABLE public.orders
DROP COLUMN IF EXISTS delivery_address;

ALTER TABLE public.orders
ADD COLUMN delivery_street TEXT NOT NULL DEFAULT '',
ADD COLUMN delivery_number TEXT NOT NULL DEFAULT '',
ADD COLUMN delivery_neighborhood TEXT NOT NULL DEFAULT '',
ADD COLUMN delivery_complement TEXT;

-- Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$function$;

-- Migration: 20251014024029
-- Add payment method columns to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_method text NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'dinheiro', 'cartao')),
ADD COLUMN change_amount numeric;

-- Migration: 20251014032527
-- Add observation column to order_items table
ALTER TABLE public.order_items
ADD COLUMN observation text;

-- Migration: 20251014055757
-- Add operating hours column to stores table
ALTER TABLE public.stores 
ADD COLUMN operating_hours JSONB DEFAULT '{
  "monday": {"open": "08:00", "close": "18:00", "is_closed": false},
  "tuesday": {"open": "08:00", "close": "18:00", "is_closed": false},
  "wednesday": {"open": "08:00", "close": "18:00", "is_closed": false},
  "thursday": {"open": "08:00", "close": "18:00", "is_closed": false},
  "friday": {"open": "08:00", "close": "18:00", "is_closed": false},
  "saturday": {"open": "08:00", "close": "14:00", "is_closed": false},
  "sunday": {"open": "08:00", "close": "12:00", "is_closed": true}
}'::jsonb;

-- Migration: 20251014064642
-- Drop existing policies for product-images bucket
DROP POLICY IF EXISTS "Store owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

-- Create correct RLS policies for product-images bucket
CREATE POLICY "Store owners can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
);

CREATE POLICY "Store owners can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Store owners can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Migration: 20251014065002
-- Create product_categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, name)
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Store owners can manage their categories"
ON public.product_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = product_categories.store_id 
    AND stores.owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view categories"
ON public.product_categories
FOR SELECT
USING (true);

-- Migration: 20251014075135
-- Fix profiles table RLS policy to prevent public data exposure
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Migration: 20251014091915
-- Create product_addons table for extras/complements
CREATE TABLE public.product_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_item_addons table to track selected addons in orders
CREATE TABLE public.order_item_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  addon_name TEXT NOT NULL,
  addon_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_addons
CREATE POLICY "Anyone can view available addons"
ON public.product_addons
FOR SELECT
USING (
  is_available = true 
  OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_addons.product_id 
    AND s.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Store owners can manage their product addons"
ON public.product_addons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_addons.product_id 
    AND s.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for order_item_addons
CREATE POLICY "Users can view addons of their order items"
ON public.order_item_addons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND (
      o.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = o.store_id AND s.owner_id = auth.uid()
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Customers can insert addons when creating order items"
ON public.order_item_addons
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_addons.order_item_id
    AND o.customer_id = auth.uid()
  )
);

-- Create trigger for product_addons updated_at
CREATE TRIGGER update_product_addons_updated_at
BEFORE UPDATE ON public.product_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251014194935
-- Add support for multi-flavor pizzas

-- Add column to products table to mark if it's a pizza
ALTER TABLE products ADD COLUMN is_pizza boolean DEFAULT false;
ALTER TABLE products ADD COLUMN max_flavors integer DEFAULT 1;

-- Create table for pizza flavors
CREATE TABLE product_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_flavors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_flavors
CREATE POLICY "Anyone can view available flavors"
  ON product_flavors FOR SELECT
  USING (
    is_available = true 
    OR EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_flavors.product_id 
        AND s.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can manage their product flavors"
  ON product_flavors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_flavors.product_id 
        AND s.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );

-- Create trigger for updated_at
CREATE TRIGGER update_product_flavors_updated_at
  BEFORE UPDATE ON product_flavors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create table for order item flavors (to track which flavors were selected in an order)
CREATE TABLE order_item_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  flavor_name text NOT NULL,
  flavor_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE order_item_flavors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_item_flavors
CREATE POLICY "Users can view flavors of their order items"
  ON order_item_flavors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_flavors.order_item_id
        AND (
          o.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM stores s
            WHERE s.id = o.store_id AND s.owner_id = auth.uid()
          )
          OR has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Customers can insert flavors when creating order items"
  ON order_item_flavors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_flavors.order_item_id
        AND o.customer_id = auth.uid()
    )
  );

-- Migration: 20251108152507
-- Add delivery_type column to orders table
ALTER TABLE orders 
ADD COLUMN delivery_type text NOT NULL DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup'));

-- Make delivery address fields nullable for pickup orders
ALTER TABLE orders 
ALTER COLUMN delivery_street DROP NOT NULL,
ALTER COLUMN delivery_number DROP NOT NULL,
ALTER COLUMN delivery_neighborhood DROP NOT NULL;

-- Migration: 20251108190419

-- View para listar todos os usuários ADMIN
CREATE OR REPLACE VIEW public.admin_users AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  p.full_name,
  p.phone,
  p.avatar_url,
  ur.created_at as role_assigned_at
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE ur.role = 'admin'::app_role;

-- View para listar todos os usuários LOJISTAS (store_owner)
CREATE OR REPLACE VIEW public.store_owner_users AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  p.full_name,
  p.phone,
  p.avatar_url,
  ur.created_at as role_assigned_at,
  s.id as store_id,
  s.name as store_name,
  s.slug as store_slug,
  s.status as store_status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.stores s ON s.owner_id = u.id
WHERE ur.role = 'store_owner'::app_role;

-- View para listar todos os usuários CLIENTES
CREATE OR REPLACE VIEW public.customer_users AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.street,
  p.street_number,
  p.neighborhood,
  p.complement,
  ur.created_at as role_assigned_at,
  COUNT(DISTINCT o.id) as total_orders
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.orders o ON o.customer_id = u.id
WHERE ur.role = 'customer'::app_role
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, 
         p.full_name, p.phone, p.avatar_url, p.street, p.street_number, 
         p.neighborhood, p.complement, ur.created_at;

-- Comentário sobre segurança:
-- Estas views acessam dados da tabela auth.users que tem suas próprias políticas de segurança.
-- O acesso a essas views deve ser controlado no código da aplicação, 
-- verificando se o usuário logado tem permissão de admin antes de consultar.
;

-- Migration: 20251108190455

-- Remover as views inseguras
DROP VIEW IF EXISTS public.admin_users;
DROP VIEW IF EXISTS public.store_owner_users;
DROP VIEW IF EXISTS public.customer_users;

-- Criar funções SECURITY DEFINER seguras que verificam permissão de admin

-- Função para listar usuários ADMIN (somente admins podem executar)
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  role_assigned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem visualizar esta lista';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone,
    p.avatar_url,
    ur.created_at
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.role = 'admin'::app_role;
END;
$$;

-- Função para listar usuários LOJISTAS (somente admins podem executar)
CREATE OR REPLACE FUNCTION public.get_store_owner_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  role_assigned_at timestamptz,
  store_id uuid,
  store_name text,
  store_slug text,
  store_status store_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem visualizar esta lista';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone,
    p.avatar_url,
    ur.created_at,
    s.id,
    s.name,
    s.slug,
    s.status
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.stores s ON s.owner_id = u.id
  WHERE ur.role = 'store_owner'::app_role;
END;
$$;

-- Função para listar usuários CLIENTES (somente admins podem executar)
CREATE OR REPLACE FUNCTION public.get_customer_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  street text,
  street_number text,
  neighborhood text,
  complement text,
  role_assigned_at timestamptz,
  total_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem visualizar esta lista';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.street,
    p.street_number,
    p.neighborhood,
    p.complement,
    ur.created_at,
    COUNT(DISTINCT o.id)
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.orders o ON o.customer_id = u.id
  WHERE ur.role = 'customer'::app_role
  GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, 
           p.full_name, p.phone, p.avatar_url, p.street, p.street_number, 
           p.neighborhood, p.complement, ur.created_at;
END;
$$;


-- Migration: 20251108190522

-- Remover as views inseguras
DROP VIEW IF EXISTS public.admin_users;
DROP VIEW IF EXISTS public.store_owner_users;
DROP VIEW IF EXISTS public.customer_users;

-- Criar funções SECURITY DEFINER seguras que verificam permissão de admin

-- Função para listar usuários ADMIN (somente admins podem executar)
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  role_assigned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem visualizar esta lista';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone,
    p.avatar_url,
    ur.created_at
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.role = 'admin'::app_role;
END;
$$;

-- Função para listar usuários LOJISTAS (somente admins podem executar)
CREATE OR REPLACE FUNCTION public.get_store_owner_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  role_assigned_at timestamptz,
  store_id uuid,
  store_name text,
  store_slug text,
  store_status store_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem visualizar esta lista';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone,
    p.avatar_url,
    ur.created_at,
    s.id,
    s.name,
    s.slug,
    s.status
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.stores s ON s.owner_id = u.id
  WHERE ur.role = 'store_owner'::app_role;
END;
$$;

-- Função para listar usuários CLIENTES (somente admins podem executar)
CREATE OR REPLACE FUNCTION public.get_customer_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  street text,
  street_number text,
  neighborhood text,
  complement text,
  role_assigned_at timestamptz,
  total_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem visualizar esta lista';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.email_confirmed_at,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.street,
    p.street_number,
    p.neighborhood,
    p.complement,
    ur.created_at,
    COUNT(DISTINCT o.id)
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.orders o ON o.customer_id = u.id
  WHERE ur.role = 'customer'::app_role
  GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, 
           p.full_name, p.phone, p.avatar_url, p.street, p.street_number, 
           p.neighborhood, p.complement, ur.created_at;
END;
$$;


-- Migration: 20251108190548

-- View para listar todos os usuários ADMIN
CREATE OR REPLACE VIEW public.admin_users AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  p.full_name,
  p.phone,
  p.avatar_url,
  ur.created_at as role_assigned_at
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE ur.role = 'admin'::app_role;

-- View para listar todos os usuários LOJISTAS (store_owner)
CREATE OR REPLACE VIEW public.store_owner_users AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  p.full_name,
  p.phone,
  p.avatar_url,
  ur.created_at as role_assigned_at,
  s.id as store_id,
  s.name as store_name,
  s.slug as store_slug,
  s.status as store_status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.stores s ON s.owner_id = u.id
WHERE ur.role = 'store_owner'::app_role;

-- View para listar todos os usuários CLIENTES
CREATE OR REPLACE VIEW public.customer_users AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.street,
  p.street_number,
  p.neighborhood,
  p.complement,
  ur.created_at as role_assigned_at,
  COUNT(DISTINCT o.id) as total_orders
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.orders o ON o.customer_id = u.id
WHERE ur.role = 'customer'::app_role
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, 
         p.full_name, p.phone, p.avatar_url, p.street, p.street_number, 
         p.neighborhood, p.complement, ur.created_at;

-- Comentário sobre segurança:
-- Estas views acessam dados da tabela auth.users que tem suas próprias políticas de segurança.
-- O acesso a essas views deve ser controlado no código da aplicação, 
-- verificando se o usuário logado tem permissão de admin antes de consultar.
;

-- Migration: 20251108190639

-- Revogar acesso público às views que expõem auth.users
REVOKE ALL ON public.admin_users FROM anon, authenticated;
REVOKE ALL ON public.store_owner_users FROM anon, authenticated;
REVOKE ALL ON public.customer_users FROM anon, authenticated;

-- Criar funções seguras que apenas admins podem acessar
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  role_assigned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário tem role de admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.admin_users;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_owner_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  role_assigned_at timestamptz,
  store_id uuid,
  store_name text,
  store_slug text,
  store_status store_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.store_owner_users;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_users()
RETURNS TABLE (
  id uuid,
  email text,
  user_created_at timestamptz,
  email_confirmed_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  street text,
  street_number text,
  neighborhood text,
  complement text,
  role_assigned_at timestamptz,
  total_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.customer_users;
END;
$$;


-- Migration: 20251108191613
-- Criar função para confirmar email de usuário manualmente (apenas admins)
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário tem role de admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar emails';
  END IF;
  
  -- Atualizar o email_confirmed_at na tabela auth.users
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;
  
  -- Retornar true se alguma linha foi atualizada
  RETURN FOUND;
END;
$$;

-- Migration: 20251109155643
-- Add WhatsApp integration fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN public.stores.whatsapp_instance IS 'Evolution API instance name for WhatsApp integration';
COMMENT ON COLUMN public.stores.whatsapp_phone IS 'Phone number associated with WhatsApp instance';


-- Migration: 20251109220811
-- Create function to call the send-order-whatsapp edge function
CREATE OR REPLACE FUNCTION notify_order_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  payload jsonb;
  project_url text := 'https://xterjbgaftyhwczknqro.supabase.co';
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0ZXJqYmdhZnR5aHdjemtucXJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDMyMTIyMywiZXhwIjoyMDc1ODk3MjIzfQ.WiF6KW7vDXIa-XJ4YY_Ee-Iq6BiBdLNfN5wZBLGTpUo';
BEGIN
  -- Build payload based on trigger operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'record', to_jsonb(NEW),
      'old_record', NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  END IF;

  -- Call the edge function asynchronously using pg_net
  SELECT net.http_post(
    url := project_url || '/functions/v1/send-order-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new orders
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_whatsapp();

-- Create trigger for order status updates
CREATE TRIGGER on_order_status_updated
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_order_whatsapp();

-- Migration: 20251109221209
-- Fix security warning: Set search_path for notify_order_whatsapp function
CREATE OR REPLACE FUNCTION notify_order_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  payload jsonb;
  project_url text := 'https://xterjbgaftyhwczknqro.supabase.co';
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0ZXJqYmdhZnR5aHdjemtucXJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDMyMTIyMywiZXhwIjoyMDc1ODk3MjIzfQ.WiF6KW7vDXIa-XJ4YY_Ee-Iq6BiBdLNfN5wZBLGTpUo';
BEGIN
  -- Build payload based on trigger operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'record', to_jsonb(NEW),
      'old_record', NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  END IF;

  -- Call the edge function asynchronously using pg_net
  SELECT net.http_post(
    url := project_url || '/functions/v1/send-order-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Migration: 20251109221319
-- Fix security warnings for all SECURITY DEFINER functions

-- Update has_role function with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Update add_admin_role_by_email function with proper search_path
CREATE OR REPLACE FUNCTION public.add_admin_role_by_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update get_store_owner_users function with proper search_path
CREATE OR REPLACE FUNCTION public.get_store_owner_users()
RETURNS TABLE(id uuid, email text, user_created_at timestamp with time zone, email_confirmed_at timestamp with time zone, full_name text, phone text, avatar_url text, role_assigned_at timestamp with time zone, store_id uuid, store_name text, store_slug text, store_status store_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.store_owner_users;
END;
$function$;

-- Update get_admin_users function with proper search_path
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(id uuid, email text, user_created_at timestamp with time zone, email_confirmed_at timestamp with time zone, full_name text, phone text, avatar_url text, role_assigned_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.admin_users;
END;
$function$;

-- Update get_customer_users function with proper search_path
CREATE OR REPLACE FUNCTION public.get_customer_users()
RETURNS TABLE(id uuid, email text, user_created_at timestamp with time zone, email_confirmed_at timestamp with time zone, full_name text, phone text, avatar_url text, street text, street_number text, neighborhood text, complement text, role_assigned_at timestamp with time zone, total_orders bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar esta função';
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.customer_users;
END;
$function$;

-- Update confirm_user_email function with proper search_path
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar emails';
  END IF;
  
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;
  
  RETURN FOUND;
END;
$function$;

-- Migration: 20251109222528
-- Fix search_path for update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Migration: 20251109225857

-- Create trigger to send WhatsApp notifications on order changes
CREATE TRIGGER trigger_order_whatsapp_notification
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_whatsapp();



-- Migration: 20251110132624
-- Revoke public access to sensitive user views
-- These views contain PII and should only be accessible via SECURITY DEFINER functions

REVOKE ALL ON admin_users FROM anon;
REVOKE ALL ON admin_users FROM authenticated;
REVOKE ALL ON customer_users FROM anon;
REVOKE ALL ON customer_users FROM authenticated;
REVOKE ALL ON store_owner_users FROM anon;
REVOKE ALL ON store_owner_users FROM authenticated;

-- Grant access only to service_role (used by SECURITY DEFINER functions)
GRANT SELECT ON admin_users TO service_role;
GRANT SELECT ON customer_users TO service_role;
GRANT SELECT ON store_owner_users TO service_role;

-- Add comment explaining the security model
COMMENT ON VIEW admin_users IS 'Access restricted to admin users via get_admin_users() function';
COMMENT ON VIEW customer_users IS 'Access restricted to admin users via get_customer_users() function';
COMMENT ON VIEW store_owner_users IS 'Access restricted to admin users via get_store_owner_users() function';
