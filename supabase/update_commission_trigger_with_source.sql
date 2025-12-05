-- Atualizar a função process_affiliate_commission_for_order para salvar commission_source
-- Esta versão salva a origem da comissão (regra específica ou padrão) em cada item

CREATE OR REPLACE FUNCTION public.process_affiliate_commission_for_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_coupon RECORD;
  v_affiliate RECORD;
  v_store_affiliate RECORD;
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_use_default_commission BOOLEAN := true;
  v_total_commission NUMERIC := 0;
  v_store_affiliate_id UUID;
  v_affiliate_id UUID;
  v_earning_id UUID;
  v_item RECORD;
  v_product RECORD;
  v_is_eligible BOOLEAN;
  v_item_discount NUMERIC;
  v_item_value_with_discount NUMERIC;
  v_item_commission NUMERIC;
  v_eligible_subtotal NUMERIC := 0;
  v_coupon_scope TEXT;
  v_category_names TEXT[];
  v_product_ids UUID[];
  v_specific_rule RECORD;
  v_item_commission_type TEXT;
  v_item_commission_value NUMERIC;
  v_commission_source TEXT;
BEGIN
  -- Buscar dados do pedido
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order.id IS NULL THEN
    RAISE NOTICE '[COMMISSION] Pedido não encontrado: %', p_order_id;
    RETURN;
  END IF;

  -- Só processar se tiver cupom
  IF v_order.coupon_code IS NULL OR v_order.coupon_code = '' THEN
    RAISE NOTICE '[COMMISSION] Pedido % sem cupom', p_order_id;
    RETURN;
  END IF;

  -- Verificar se já existe comissão para este pedido
  IF EXISTS (SELECT 1 FROM affiliate_earnings WHERE order_id = p_order_id) THEN
    RAISE NOTICE '[COMMISSION] Comissão já existe para pedido %', p_order_id;
    RETURN;
  END IF;

  -- Verificar se existem itens no pedido
  IF NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = p_order_id AND deleted_at IS NULL) THEN
    RAISE NOTICE '[COMMISSION] Pedido % ainda não tem itens', p_order_id;
    RETURN;
  END IF;

  RAISE NOTICE '[COMMISSION] Processando comissão para pedido % com cupom %', p_order_id, v_order.coupon_code;

  -- Buscar o cupom COM escopo
  SELECT id, code, discount_type, discount_value, applies_to, category_names, product_ids
  INTO v_coupon
  FROM coupons 
  WHERE store_id = v_order.store_id 
  AND UPPER(code) = UPPER(v_order.coupon_code)
  LIMIT 1;

  IF v_coupon.id IS NULL THEN
    RAISE NOTICE '[COMMISSION] Cupom não encontrado: %', v_order.coupon_code;
    RETURN;
  END IF;

  v_coupon_scope := COALESCE(v_coupon.applies_to, 'all');
  v_category_names := COALESCE(v_coupon.category_names, '{}');
  v_product_ids := COALESCE(v_coupon.product_ids, '{}');

  RAISE NOTICE '[COMMISSION] Cupom encontrado: % - Escopo: %', v_coupon.code, v_coupon_scope;

  -- ========== BUSCA DO AFILIADO ==========
  
  -- MÉTODO 1: store_affiliate_coupons (sistema novo)
  SELECT 
    sa.id as store_affiliate_id,
    sa.default_commission_type,
    sa.default_commission_value,
    COALESCE(sa.use_default_commission, true) as use_default_commission,
    aa.id as affiliate_account_id
  INTO v_store_affiliate
  FROM store_affiliate_coupons sac
  JOIN store_affiliates sa ON sa.id = sac.store_affiliate_id
  JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
  WHERE sac.coupon_id = v_coupon.id
  AND sa.store_id = v_order.store_id
  AND sa.is_active = true
  LIMIT 1;

  IF v_store_affiliate.store_affiliate_id IS NOT NULL THEN
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN affiliate_accounts aa ON LOWER(aa.email) = LOWER(a.email)
    WHERE aa.id = v_store_affiliate.affiliate_account_id
    AND a.store_id = v_order.store_id
    LIMIT 1;
    
    v_store_affiliate_id := v_store_affiliate.store_affiliate_id;
    v_commission_type := v_store_affiliate.default_commission_type;
    v_commission_value := v_store_affiliate.default_commission_value;
    v_use_default_commission := v_store_affiliate.use_default_commission;
  END IF;

  -- MÉTODO 2: store_affiliates.coupon_id
  IF v_store_affiliate_id IS NULL THEN
    SELECT sa.id, sa.default_commission_type, sa.default_commission_value, 
           COALESCE(sa.use_default_commission, true) as use_default_commission
    INTO v_store_affiliate
    FROM store_affiliates sa
    WHERE sa.coupon_id = v_coupon.id
    AND sa.store_id = v_order.store_id
    AND sa.is_active = true
    LIMIT 1;

    IF v_store_affiliate.id IS NOT NULL THEN
      v_store_affiliate_id := v_store_affiliate.id;
      v_commission_type := v_store_affiliate.default_commission_type;
      v_commission_value := v_store_affiliate.default_commission_value;
      v_use_default_commission := v_store_affiliate.use_default_commission;
      
      SELECT a.id INTO v_affiliate_id
      FROM affiliates a
      JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE LOWER(a.email) = LOWER(aa.email)
      AND a.store_id = v_order.store_id
      LIMIT 1;
    END IF;
  END IF;

  -- MÉTODO 3: affiliate_coupons (legado)
  IF v_affiliate_id IS NULL THEN
    SELECT a.id, a.default_commission_type, a.default_commission_value,
           COALESCE(a.use_default_commission, true) as use_default_commission
    INTO v_affiliate
    FROM affiliate_coupons ac
    JOIN affiliates a ON a.id = ac.affiliate_id
    WHERE ac.coupon_id = v_coupon.id
    AND a.store_id = v_order.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      v_use_default_commission := v_affiliate.use_default_commission;
      
      SELECT sa.id INTO v_store_affiliate_id
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      JOIN affiliates a ON LOWER(a.email) = LOWER(aa.email)
      WHERE a.id = v_affiliate_id
      AND sa.store_id = v_order.store_id
      AND sa.is_active = true
      LIMIT 1;
    END IF;
  END IF;

  -- MÉTODO 4: affiliates.coupon_id (legado)
  IF v_affiliate_id IS NULL THEN
    SELECT a.id, a.default_commission_type, a.default_commission_value,
           COALESCE(a.use_default_commission, true) as use_default_commission
    INTO v_affiliate
    FROM affiliates a
    WHERE a.coupon_id = v_coupon.id
    AND a.store_id = v_order.store_id
    AND a.is_active = true
    LIMIT 1;

    IF v_affiliate.id IS NOT NULL THEN
      v_affiliate_id := v_affiliate.id;
      v_commission_type := v_affiliate.default_commission_type;
      v_commission_value := v_affiliate.default_commission_value;
      v_use_default_commission := v_affiliate.use_default_commission;
      
      SELECT sa.id INTO v_store_affiliate_id
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE LOWER(aa.email) = (SELECT LOWER(email) FROM affiliates WHERE id = v_affiliate_id)
      AND sa.store_id = v_order.store_id
      AND sa.is_active = true
      LIMIT 1;
    END IF;
  END IF;

  -- Se não encontrou afiliado, sair
  IF v_affiliate_id IS NULL AND v_store_affiliate_id IS NULL THEN
    RAISE NOTICE '[COMMISSION] Nenhum afiliado encontrado para cupom %', v_order.coupon_code;
    RETURN;
  END IF;

  -- Garantir affiliate_id
  IF v_affiliate_id IS NULL AND v_store_affiliate_id IS NOT NULL THEN
    SELECT a.id INTO v_affiliate_id
    FROM affiliates a
    JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
    JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
    WHERE LOWER(a.email) = LOWER(aa.email)
    AND a.store_id = v_order.store_id
    LIMIT 1;
    
    IF v_affiliate_id IS NULL THEN
      INSERT INTO affiliates (store_id, name, email, default_commission_type, default_commission_value, use_default_commission, is_active)
      SELECT v_order.store_id, aa.name, aa.email, sa.default_commission_type, sa.default_commission_value, 
             COALESCE(sa.use_default_commission, true), true
      FROM store_affiliates sa
      JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
      WHERE sa.id = v_store_affiliate_id
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_affiliate_id;
      
      IF v_affiliate_id IS NULL THEN
        SELECT a.id INTO v_affiliate_id
        FROM affiliates a
        JOIN store_affiliates sa ON sa.id = v_store_affiliate_id
        JOIN affiliate_accounts aa ON aa.id = sa.affiliate_account_id
        WHERE LOWER(a.email) = LOWER(aa.email)
        AND a.store_id = v_order.store_id
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  RAISE NOTICE '[COMMISSION] Afiliado: %, use_default: %, type: %, value: %',
    v_affiliate_id, v_use_default_commission, v_commission_type, v_commission_value;

  -- Calcular subtotal elegível
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = p_order_id AND oi.deleted_at IS NULL
  LOOP
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    IF v_is_eligible THEN
      v_eligible_subtotal := v_eligible_subtotal + v_item.subtotal;
    END IF;
  END LOOP;

  RAISE NOTICE '[COMMISSION] Subtotal elegível: % de total %', v_eligible_subtotal, v_order.subtotal;

  -- Criar registro principal de earnings
  INSERT INTO affiliate_earnings (
    affiliate_id, store_affiliate_id, order_id, order_total,
    commission_type, commission_value, commission_amount, status
  ) VALUES (
    v_affiliate_id, v_store_affiliate_id, p_order_id, v_order.subtotal - COALESCE(v_order.coupon_discount, 0),
    v_commission_type, v_commission_value, 0, 'pending'
  )
  RETURNING id INTO v_earning_id;

  -- Processar cada item
  FOR v_item IN 
    SELECT oi.id, oi.product_id, oi.product_name, oi.subtotal, oi.quantity, oi.unit_price
    FROM order_items oi 
    WHERE oi.order_id = p_order_id AND oi.deleted_at IS NULL
  LOOP
    SELECT category INTO v_product FROM products WHERE id = v_item.product_id;
    
    -- Elegibilidade
    v_is_eligible := false;
    IF v_coupon_scope = 'all' THEN
      v_is_eligible := true;
    ELSIF v_coupon_scope = 'category' AND v_product.category IS NOT NULL THEN
      v_is_eligible := v_product.category = ANY(v_category_names);
    ELSIF v_coupon_scope = 'product' THEN
      v_is_eligible := v_item.product_id = ANY(v_product_ids);
    END IF;
    
    -- Calcular desconto do item
    IF v_is_eligible AND v_eligible_subtotal > 0 THEN
      v_item_discount := (v_item.subtotal / v_eligible_subtotal) * COALESCE(v_order.coupon_discount, 0);
    ELSE
      v_item_discount := 0;
    END IF;
    
    v_item_value_with_discount := v_item.subtotal - v_item_discount;
    
    -- ========== HIERARQUIA DE COMISSÃO ==========
    v_specific_rule := NULL;
    v_commission_source := 'none';
    v_item_commission_type := NULL;
    v_item_commission_value := 0;
    
    -- 1. Verificar regra específica do produto
    IF v_item.product_id IS NOT NULL AND v_affiliate_id IS NOT NULL THEN
      SELECT commission_type, commission_value
      INTO v_specific_rule
      FROM affiliate_commission_rules
      WHERE affiliate_id = v_affiliate_id
      AND product_id = v_item.product_id
      AND applies_to = 'product'
      AND is_active = true
      LIMIT 1;
    END IF;
    
    IF v_specific_rule.commission_type IS NOT NULL THEN
      -- PRIORIDADE 1: Regra específica do produto
      v_item_commission_type := v_specific_rule.commission_type;
      v_item_commission_value := v_specific_rule.commission_value;
      v_commission_source := 'specific_product';
      RAISE NOTICE '[COMMISSION] Item %: REGRA ESPECÍFICA (% %)', v_item.product_name, v_item_commission_value, v_item_commission_type;
    ELSIF v_use_default_commission = true THEN
      -- PRIORIDADE 2: Comissão padrão
      v_item_commission_type := v_commission_type;
      v_item_commission_value := v_commission_value;
      v_commission_source := 'default';
      RAISE NOTICE '[COMMISSION] Item %: PADRÃO (% %)', v_item.product_name, v_item_commission_value, v_item_commission_type;
    ELSE
      -- PRIORIDADE 3: Sem comissão
      v_item_commission_type := 'percentage';
      v_item_commission_value := 0;
      v_commission_source := 'none';
      RAISE NOTICE '[COMMISSION] Item %: SEM COMISSÃO', v_item.product_name;
    END IF;
    
    -- Calcular comissão do item
    IF v_item_commission_value > 0 THEN
      IF v_item_commission_type = 'percentage' THEN
        v_item_commission := (v_item_value_with_discount * v_item_commission_value) / 100;
      ELSE
        v_item_commission := (v_item.subtotal / GREATEST(v_order.subtotal, 1)) * v_item_commission_value;
      END IF;
    ELSE
      v_item_commission := 0;
    END IF;
    
    v_total_commission := v_total_commission + v_item_commission;
    
    -- Inserir detalhes do item COM commission_source
    INSERT INTO affiliate_item_earnings (
      earning_id, order_item_id, product_id, product_name, product_category,
      item_subtotal, item_discount, item_value_with_discount,
      is_coupon_eligible, coupon_scope,
      commission_type, commission_value, commission_amount,
      commission_source
    ) VALUES (
      v_earning_id, v_item.id, v_item.product_id, v_item.product_name, v_product.category,
      v_item.subtotal, v_item_discount, v_item_value_with_discount,
      v_is_eligible, v_coupon_scope,
      v_item_commission_type, v_item_commission_value, v_item_commission,
      v_commission_source
    );
  END LOOP;

  -- Atualizar total da comissão
  UPDATE affiliate_earnings 
  SET commission_amount = v_total_commission
  WHERE id = v_earning_id;

  RAISE NOTICE '[COMMISSION] ✅ Comissão total: % para pedido %', v_total_commission, p_order_id;
END;
$function$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission_for_order(UUID) TO authenticated, anon, service_role;
