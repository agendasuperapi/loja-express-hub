
-- Criar uma função RPC para criar pedidos, contornando o PostgREST REST endpoint
CREATE OR REPLACE FUNCTION public.create_order_rpc(
  p_store_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_type TEXT,
  p_order_number TEXT,
  p_subtotal NUMERIC,
  p_delivery_fee NUMERIC,
  p_total NUMERIC,
  p_payment_method TEXT,
  p_delivery_street TEXT DEFAULT NULL,
  p_delivery_number TEXT DEFAULT NULL,
  p_delivery_neighborhood TEXT DEFAULT NULL,
  p_delivery_complement TEXT DEFAULT NULL,
  p_change_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_customer_id UUID;
  v_result jsonb;
BEGIN
  -- Get current user ID
  v_customer_id := auth.uid();
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Insert order
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
    change_amount,
    notes
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
    p_change_amount,
    p_notes
  )
  RETURNING id INTO v_order_id;
  
  -- Return the created order as JSON
  SELECT to_jsonb(o.*) INTO v_result
  FROM public.orders o
  WHERE o.id = v_order_id;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order_rpc TO authenticated;
