-- Create saved_carts table for abandoned cart recovery
CREATE TABLE IF NOT EXISTS public.saved_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  coupon_code TEXT,
  coupon_discount NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only have one saved cart per store
  UNIQUE(user_id, store_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_carts_user_id ON public.saved_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_carts_store_id ON public.saved_carts(store_id);
CREATE INDEX IF NOT EXISTS idx_saved_carts_updated_at ON public.saved_carts(updated_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_saved_carts_updated_at
  BEFORE UPDATE ON public.saved_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own saved carts
CREATE POLICY "Users can manage own saved carts" ON public.saved_carts
  FOR ALL 
  USING (auth.uid() = user_id);

-- Store owners can view abandoned carts for remarketing
CREATE POLICY "Store owners can view abandoned carts" ON public.saved_carts
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = saved_carts.store_id 
      AND stores.owner_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
  );
