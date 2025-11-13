-- Fix Warn-Level Security Issues
-- 1. Add phone validation to create_order_rpc
-- 2. Ensure all functions have SET search_path

-- 1. Update create_order_rpc with proper phone validation
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
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_cleaned_phone text;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Validate and clean phone number
  IF p_customer_phone IS NULL OR p_customer_phone = '' THEN
    RAISE EXCEPTION 'Número de telefone é obrigatório';
  END IF;
  
  -- Remove non-digit characters and validate
  v_cleaned_phone := REGEXP_REPLACE(p_customer_phone, '[^0-9]', '', 'g');
  
  IF LENGTH(v_cleaned_phone) < 10 OR LENGTH(v_cleaned_phone) > 15 THEN
    RAISE EXCEPTION 'Número de telefone inválido. Por favor, forneça um número válido com código de país e DDD (ex: 5511999999999)';
  END IF;
  
  -- Ensure country code prefix
  IF NOT v_cleaned_phone ~ '^55' THEN
    v_cleaned_phone := '55' || v_cleaned_phone;
  END IF;
  
  -- Insert order with validated phone
  INSERT INTO public.orders (
    store_id, customer_id, customer_name, customer_phone, delivery_type, order_number,
    subtotal, delivery_fee, total, payment_method, delivery_street, delivery_number,
    delivery_neighborhood, delivery_complement, change_amount, notes, status
  )
  VALUES (
    p_store_id, auth.uid(), p_customer_name, v_cleaned_phone, p_delivery_type, p_order_number,
    p_subtotal, p_delivery_fee, p_total, p_payment_method, p_delivery_street, p_delivery_number,
    p_delivery_neighborhood, p_delivery_complement, p_change_amount, p_notes, 'pending'
  )
  RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;

-- 2. Update functions that don't have search_path set
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fc_criar_pg_stripe_server_afiliado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url TEXT := 'https://hzmixuvrnzpypriagecv.supabase.co/rest/v1/rpc/fc_criar_pagamento_stripe_app';
  service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bWl4dXZybnpweXByaWFnZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NjkzMTQsImV4cCI6MjA0MDU0NTMxNH0.VHtjYivpM8c9RLmKimwRiLgnb8zqGrZ88Q8vpVLZcZ0';
  apikey TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bWl4dXZybnpweXByaWFnZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NjkzMTQsImV4cCI6MjA0MDU0NTMxNH0.VHtjYivpM8c9RLmKimwRiLgnb8zqGrZ88Q8vpVLZcZ0';
BEGIN
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'apikey', apikey,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'param_user_id', NEW.id,
      'param_email', NEW.email,
      'param_nome', NEW.raw_user_meta_data ->> 'full_name',
      'param_id_af_app', NEW.raw_user_meta_data ->> 'id_af_app',
      'param_id_plano_preco', NEW.raw_user_meta_data ->> 'id_plano_preco',
      'param_cupom', NEW.raw_user_meta_data ->> 'nome_cupom',
      'param_renovacao', 'false',
      'param_checkout', 'true',
      'param_ass', 'true',
      'param_rec', 'false',
      'param_dias_try', '0',
      'param_data', '2025-09-12 16:53:06.029',
      'param_token', '1234567',
      'param_dv', '1234567',
      'param_key', '1234567'
    )
  );

  RAISE WARNING '[AUTH_TRIGGER] ✅ fc_criar_pagamento_stripe_app excecutada : ID=%, Email=%', NEW.id, NEW.email;
  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING '[AUTH_TRIGGER] ⚠️ já existe na tabela: %', NEW.id;
    RETURN NEW;
  WHEN others THEN
    RAISE WARNING '[AUTH_TRIGGER] ❌ ERRO CRÍTICO: % - %', SQLERRM, SQLSTATE;
    RAISE WARNING '[AUTH_TRIGGER] Dados que falharam: ID=%, Email=%', NEW.id, NEW.email;
    RETURN NEW;
END;
$$;