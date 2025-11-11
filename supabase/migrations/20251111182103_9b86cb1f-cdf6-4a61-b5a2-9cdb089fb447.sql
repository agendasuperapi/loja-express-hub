-- Remover coluna notes que está causando conflito
ALTER TABLE public.orders DROP COLUMN IF EXISTS notes;

-- Recriar a função RPC de forma simplificada - retornando TEXT (UUID) em vez de JSONB
DROP FUNCTION IF EXISTS public.create_order_rpc(uuid, text, text, text, text, numeric, numeric, numeric, text, text, text, text, text, numeric, text);

CREATE OR REPLACE FUNCTION public.create_order_rpc(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_type text,
  p_order_number text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_payment_method text,
  p_delivery_street text DEFAULT NULL,
  p_delivery_number text DEFAULT NULL,
  p_delivery_neighborhood text DEFAULT NULL,
  p_delivery_complement text DEFAULT NULL,
  p_change_amount numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_customer_id UUID;
BEGIN
  v_customer_id := auth.uid();
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  INSERT INTO public.orders (
    store_id,
    customer_id,
    customer_name,
    customer_phone,
    delivery_type,
    order_number,
    subtotal,
    delivery_fee,
    total,
    status,
    payment_method,
    delivery_street,
    delivery_number,
    delivery_neighborhood,
    delivery_complement,
    change_amount
  ) VALUES (
    p_store_id,
    v_customer_id,
    p_customer_name,
    p_customer_phone,
    p_delivery_type,
    p_order_number,
    p_subtotal,
    p_delivery_fee,
    p_total,
    'pending',
    p_payment_method,
    p_delivery_street,
    p_delivery_number,
    p_delivery_neighborhood,
    p_delivery_complement,
    p_change_amount
  )
  RETURNING id INTO v_order_id;
  
  RETURN v_order_id::TEXT;
END;
$$;