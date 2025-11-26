-- Create product_sizes table
CREATE TABLE public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for product_sizes
CREATE INDEX idx_product_sizes_product_id ON public.product_sizes(product_id);
CREATE INDEX idx_product_sizes_display_order ON public.product_sizes(display_order);
CREATE INDEX idx_product_sizes_is_available ON public.product_sizes(is_available);

-- Create order_item_sizes table
CREATE TABLE public.order_item_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  size_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for order_item_sizes
CREATE INDEX idx_order_item_sizes_order_item_id ON public.order_item_sizes(order_item_id);

-- Add has_sizes column to products table
ALTER TABLE public.products ADD COLUMN has_sizes BOOLEAN DEFAULT false;

-- Add updated_at trigger for product_sizes
CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON public.product_sizes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_sizes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_sizes
CREATE POLICY "Anyone can view available sizes (public)"
  ON public.product_sizes
  FOR SELECT
  USING (
    is_available = true
    OR EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_sizes.product_id
      AND (
        s.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.store_employees
          WHERE store_id = s.id
          AND user_id = auth.uid()
          AND is_active = true
          AND (permissions->'products'->>'view')::boolean = true
        )
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners and employees can manage sizes"
  ON public.product_sizes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_sizes.product_id
      AND (
        s.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.store_employees
          WHERE store_id = s.id
          AND user_id = auth.uid()
          AND is_active = true
          AND (permissions->'products'->>'update')::boolean = true
        )
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for order_item_sizes
CREATE POLICY "Customers can insert sizes when creating order items"
  ON public.order_item_sizes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_sizes.order_item_id
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can view sizes of their order items"
  ON public.order_item_sizes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_sizes.order_item_id
      AND (
        o.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = o.store_id
          AND s.owner_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Comments
COMMENT ON TABLE public.product_sizes IS 'Stores different size options for products with their respective prices';
COMMENT ON TABLE public.order_item_sizes IS 'Stores the size selected for each order item';
COMMENT ON COLUMN public.products.has_sizes IS 'Indicates if this product uses the size system';